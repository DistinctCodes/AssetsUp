#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, Map, Vec, Symbol};

// -----------------------------
// DATA STRUCTURES
// -----------------------------

#[contracttype]
#[derive(Clone)]
pub enum DepreciationMethod {
    StraightLine,
    DecliningBalance,
    DoubleDecliningBalance,
    UnitsOfProduction,
    SumOfYearsDigits,
}

#[contracttype]
#[derive(Clone)]
pub enum ValuationMethod {
    Market,
    Appraisal,
    Calculated,
    Oracle,
}

#[contracttype]
#[derive(Clone)]
pub struct ValuationRecord {
    pub valuation_id: u64,
    pub asset_id: u64,
    pub valuation_date: u64,
    pub purchase_price: i128,
    pub market_value: i128,
    pub book_value: i128,
    pub delta: i128,
    pub method: ValuationMethod,
    pub valuator: Address,
    pub confidence: u32,
    pub doc_hash: BytesN<32>,
    pub notes: Symbol,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct DepreciationSchedule {
    pub asset_id: u64,
    pub purchase_date: u64,
    pub purchase_price: i128,
    pub salvage_value: i128,
    pub useful_life_months: u32,
    pub method: DepreciationMethod,
    pub rate: u32,
    pub accumulated: i128,
    pub book_value: i128,
    pub last_calc: u64,
    pub next_calc: u64,
    pub auto_calc: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct DepreciationEntry {
    pub entry_id: u64,
    pub asset_id: u64,
    pub period: u64,
    pub opening_value: i128,
    pub depreciation: i128,
    pub accumulated: i128,
    pub closing_value: i128,
    pub method: DepreciationMethod,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct ValuationOracle {
    pub oracle: Address,
    pub name: Symbol,
    pub accuracy: u32,
    pub total_vals: u64,
    pub active: bool,
    pub registered_at: u64,
}

#[contracttype]
pub enum DataKey {
    Admin,
    AssetRegistry,
    Schedules(u64),
    DepreciationHistory(u64),
    Valuations(u64),
    Oracle(Address),
    ValuationCounter,
    DepreciationCounter,
}

// -----------------------------
// CONTRACT
// -----------------------------

#[contract]
pub struct AssetDepreciationContract;

#[contractimpl]
impl AssetDepreciationContract {
    // -------------------------
    // INIT
    // -------------------------
    pub fn init(env: Env, admin: Address, asset_registry: Address) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::AssetRegistry, &asset_registry);
        env.storage().instance().set(&DataKey::ValuationCounter, &0u64);
        env.storage().instance().set(&DataKey::DepreciationCounter, &0u64);
    }

    // -------------------------
    // ACCESS HELPERS
    // -------------------------
    fn assert_admin(env: &Env) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
    }

    // -------------------------
    // ORACLES
    // -------------------------
    pub fn register_oracle(env: Env, oracle: Address, name: Symbol, accuracy: u32) {
        Self::assert_admin(&env);
        let data = ValuationOracle {
            oracle: oracle.clone(),
            name,
            accuracy,
            total_vals: 0,
            active: true,
            registered_at: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&DataKey::Oracle(oracle), &data);
    }

    // -------------------------
    // DEPRECIATION SCHEDULE
    // -------------------------
    pub fn set_schedule(env: Env, schedule: DepreciationSchedule) {
        if schedule.purchase_price <= 0 { panic!("Invalid price") }
        if schedule.salvage_value >= schedule.purchase_price { panic!("Invalid salvage") }
        env.storage().persistent().set(&DataKey::Schedules(schedule.asset_id), &schedule);
    }

    // -------------------------
    // CALCULATION CORE
    // -------------------------
    pub fn calculate_depreciation(env: Env, asset_id: u64, period_ts: u64) -> i128 {
        let mut schedule: DepreciationSchedule = env
            .storage()
            .persistent()
            .get(&DataKey::Schedules(asset_id))
            .unwrap();

        if schedule.book_value <= schedule.salvage_value {
            return 0;
        }

        let dep = match schedule.method {
            DepreciationMethod::StraightLine => {
                (schedule.purchase_price - schedule.salvage_value)
                    / schedule.useful_life_months as i128
            }
            DepreciationMethod::DecliningBalance => {
                schedule.book_value * schedule.rate as i128 / 100
            }
            DepreciationMethod::DoubleDecliningBalance => {
                let rate = 2 * 100 / schedule.useful_life_months as i128;
                schedule.book_value * rate / 100
            }
            _ => 0,
        };

        let depreciation = core::cmp::min(dep, schedule.book_value - schedule.salvage_value);

        schedule.accumulated += depreciation;
        schedule.book_value -= depreciation;
        schedule.last_calc = period_ts;
        env.storage().persistent().set(&DataKey::Schedules(asset_id), &schedule);

        let mut counter: u64 = env.storage().instance().get(&DataKey::DepreciationCounter).unwrap();
        counter += 1;
        env.storage().instance().set(&DataKey::DepreciationCounter, &counter);

        let entry = DepreciationEntry {
            entry_id: counter,
            asset_id,
            period: period_ts,
            opening_value: schedule.book_value + depreciation,
            depreciation,
            accumulated: schedule.accumulated,
            closing_value: schedule.book_value,
            method: schedule.method.clone(),
            timestamp: env.ledger().timestamp(),
        };

        let mut history: Vec<DepreciationEntry> = env
            .storage()
            .persistent()
            .get(&DataKey::DepreciationHistory(asset_id))
            .unwrap_or(Vec::new(&env));
        history.push_back(entry);
        env.storage().persistent().set(&DataKey::DepreciationHistory(asset_id), &history);

        depreciation
    }

    // -------------------------
    // VALUATION
    // -------------------------
    pub fn record_valuation(
        env: Env,
        asset_id: u64,
        market_value: i128,
        method: ValuationMethod,
        confidence: u32,
        doc_hash: BytesN<32>,
        notes: Symbol,
    ) {
        if confidence > 100 { panic!("Invalid confidence") }

        let mut counter: u64 = env.storage().instance().get(&DataKey::ValuationCounter).unwrap();
        counter += 1;
        env.storage().instance().set(&DataKey::ValuationCounter, &counter);

        let schedule: DepreciationSchedule = env
            .storage()
            .persistent()
            .get(&DataKey::Schedules(asset_id))
            .unwrap();

        let record = ValuationRecord {
            valuation_id: counter,
            asset_id,
            valuation_date: env.ledger().timestamp(),
            purchase_price: schedule.purchase_price,
            market_value,
            book_value: schedule.book_value,
            delta: market_value - schedule.book_value,
            method,
            valuator: env.invoker(),
            confidence,
            doc_hash,
            notes,
            timestamp: env.ledger().timestamp(),
        };

        let mut vals: Vec<ValuationRecord> = env
            .storage()
            .persistent()
            .get(&DataKey::Valuations(asset_id))
            .unwrap_or(Vec::new(&env));
        vals.push_back(record);
        env.storage().persistent().set(&DataKey::Valuations(asset_id), &vals);
    }

    // -------------------------
    // QUERIES
    // -------------------------
    pub fn get_book_value(env: Env, asset_id: u64) -> i128 {
        let schedule: DepreciationSchedule = env
            .storage()
            .persistent()
            .get(&DataKey::Schedules(asset_id))
            .unwrap();
        schedule.book_value
    }

    pub fn get_depreciation_history(env: Env, asset_id: u64) -> Vec<DepreciationEntry> {
        env.storage()
            .persistent()
            .get(&DataKey::DepreciationHistory(asset_id))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_valuations(env: Env, asset_id: u64) -> Vec<ValuationRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::Valuations(asset_id))
            .unwrap_or(Vec::new(&env))
    }
}
