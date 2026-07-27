//! Checked arithmetic for value-carrying paths ([SC-43]).
//!
//! `overflow-checks = true` is set on the release profile, which turns an
//! overflow into a **panic** — a trapped transaction the caller cannot
//! distinguish from any other trap. On paths that move asset value, share
//! counts, dividends, or percentages, an explicit typed error is far more
//! useful: the caller learns *what* went wrong.
//!
//! Every helper here maps failure to [`Error::MathOverflow`] or
//! [`Error::MathUnderflow`] rather than trapping.
//!
//! ## Rounding
//!
//! [`mul_div`] truncates toward zero — the same direction as Rust's `/` on
//! non-negative operands, so it rounds **down** for the non-negative values
//! these contracts deal in.
//!
//! The remainder is **not** distributed. For a dividend split this means the
//! contract retains up to `holder_count - 1` stroops per distribution rather
//! than paying them to an arbitrarily chosen holder. That is the deliberate
//! choice: rounding in favour of the contract can never overpay, and picking a
//! holder to absorb the remainder would silently advantage whoever happens to
//! be first in iteration order.
//!
//! For an ownership percentage in basis points, rounding down means the
//! reported percentages can sum to slightly less than 10000. They are a
//! derived display value; the authoritative figure is always `balance`.

use crate::error::Error;

/// `a + b`, or [`Error::MathOverflow`].
pub fn add(a: i128, b: i128) -> Result<i128, Error> {
    a.checked_add(b).ok_or(Error::MathOverflow)
}

/// `a - b`, or [`Error::MathUnderflow`].
pub fn sub(a: i128, b: i128) -> Result<i128, Error> {
    a.checked_sub(b).ok_or(Error::MathUnderflow)
}

/// `a * b`, or [`Error::MathOverflow`].
///
/// Not currently called — [`mul_div`] covers every multiplication on a
/// value-carrying path today. Kept so the checked-arithmetic surface is
/// complete and a future caller reaches for it rather than a bare `*`.
#[allow(dead_code)]
pub fn mul(a: i128, b: i128) -> Result<i128, Error> {
    a.checked_mul(b).ok_or(Error::MathOverflow)
}

/// `(a * b) / d`, rounding toward zero.
///
/// The naive spelling `(a * b) / d` overflows whenever the intermediate
/// product exceeds `i128::MAX`, even when the final result is small — which is
/// exactly the case for proportional splits, where `balance * total_amount` is
/// large but the quotient is not. This computes the same value without
/// trapping, and returns [`Error::MathOverflow`] when the product genuinely
/// cannot be represented.
///
/// Returns [`Error::MathOverflow`] if `d` is zero, since a zero denominator
/// here always means a corrupt total supply rather than a caller mistake.
pub fn mul_div(a: i128, b: i128, d: i128) -> Result<i128, Error> {
    if d == 0 {
        return Err(Error::MathOverflow);
    }

    // The common case: the product fits, so compute it directly.
    if let Some(product) = a.checked_mul(b) {
        return Ok(product / d);
    }

    // The product does not fit. Reduce the fraction before multiplying by
    // cancelling the greatest common divisor of each operand with the
    // denominator, then retry. This rescues the realistic case where the
    // denominator shares factors with one of the operands — a holder balance
    // against a total supply, for instance.
    let g1 = gcd(a.unsigned_abs(), d.unsigned_abs());
    let (a, d) = (a / g1 as i128, d / g1 as i128);

    let g2 = gcd(b.unsigned_abs(), d.unsigned_abs());
    let (b, d) = (b / g2 as i128, d / g2 as i128);

    match a.checked_mul(b) {
        Some(product) => Ok(product / d),
        None => Err(Error::MathOverflow),
    }
}

fn gcd(mut a: u128, mut b: u128) -> u128 {
    while b != 0 {
        let t = b;
        b = a % b;
        a = t;
    }
    if a == 0 {
        1
    } else {
        a
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn add_reports_overflow_instead_of_trapping() {
        assert_eq!(add(1, 2), Ok(3));
        assert_eq!(add(i128::MAX, 0), Ok(i128::MAX));
        assert_eq!(add(i128::MAX, 1), Err(Error::MathOverflow));
    }

    #[test]
    fn sub_reports_underflow_instead_of_trapping() {
        assert_eq!(sub(3, 2), Ok(1));
        assert_eq!(sub(0, 0), Ok(0));
        assert_eq!(sub(i128::MIN, 1), Err(Error::MathUnderflow));
    }

    #[test]
    fn mul_reports_overflow_instead_of_trapping() {
        assert_eq!(mul(0, i128::MAX), Ok(0));
        assert_eq!(mul(1, i128::MAX), Ok(i128::MAX));
        assert_eq!(mul(2, i128::MAX), Err(Error::MathOverflow));
    }

    #[test]
    fn mul_div_handles_the_ordinary_case() {
        // A 25% holder of a 1000-token supply receives 25% of 400.
        assert_eq!(mul_div(250, 400, 1000), Ok(100));
    }

    #[test]
    fn mul_div_survives_an_intermediate_product_that_would_overflow() {
        // balance * total_amount overflows i128, but the result is small.
        // Written naively as (a * b) / d this traps.
        let balance = i128::MAX / 2;
        let total_amount = 1000i128;
        let total_supply = i128::MAX / 2;

        assert!(balance.checked_mul(total_amount).is_none());
        assert_eq!(mul_div(balance, total_amount, total_supply), Ok(1000));
    }

    #[test]
    fn mul_div_rounds_down() {
        // 1 of 3 holders splitting 10: each gets 3, one unit is retained.
        assert_eq!(mul_div(1, 10, 3), Ok(3));
        assert_eq!(mul_div(2, 10, 3), Ok(6));
        // The remainder stays with the contract rather than being handed to a
        // holder chosen by iteration order.
        assert_eq!(mul_div(1, 10, 3).unwrap() * 3, 9);
    }

    #[test]
    fn mul_div_boundaries_at_zero_and_one() {
        assert_eq!(mul_div(0, 1000, 10), Ok(0));
        assert_eq!(mul_div(1, 0, 10), Ok(0));
        assert_eq!(mul_div(1, 1, 1), Ok(1));
        assert_eq!(mul_div(i128::MAX, 1, i128::MAX), Ok(1));
    }

    #[test]
    fn mul_div_rejects_a_zero_denominator() {
        assert_eq!(mul_div(1, 1, 0), Err(Error::MathOverflow));
    }

    #[test]
    fn mul_div_reports_overflow_when_the_result_truly_cannot_fit() {
        // Coprime operands with a denominator of 1: nothing can be cancelled
        // and the product genuinely does not fit.
        assert_eq!(mul_div(i128::MAX, 3, 1), Err(Error::MathOverflow));
    }

    #[test]
    fn gcd_is_well_behaved_at_zero() {
        assert_eq!(gcd(0, 0), 1);
        assert_eq!(gcd(0, 5), 5);
        assert_eq!(gcd(12, 18), 6);
    }
}
