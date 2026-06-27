import { Injectable } from '@nestjs/common';

export interface DepreciationInput {
  purchasePrice: number;
  salvageValue: number;
  usefulLife: number;
  purchaseDate: Date;
}

export interface DepreciationResult {
  annualDepreciation: number;
  monthlyDepreciation: number;
  currentBookValue: number;
  accumulatedDepreciation: number;
  remainingLife: number;
}

@Injectable()
export class DepreciationService {
  calculateStraightLine(input: DepreciationInput): DepreciationResult {
    const { purchasePrice, salvageValue, usefulLife, purchaseDate } = input;
    const annualDepreciation = (purchasePrice - salvageValue) / usefulLife;
    const monthlyDepreciation = annualDepreciation / 12;
    const now = new Date();
    const yearsOwned = (now.getTime() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const accumulatedDepreciation = Math.min(annualDepreciation * yearsOwned, purchasePrice - salvageValue);
    const currentBookValue = purchasePrice - accumulatedDepreciation;
    const remainingLife = Math.max(0, usefulLife - yearsOwned);

    return {
      annualDepreciation: Math.round(annualDepreciation * 100) / 100,
      monthlyDepreciation: Math.round(monthlyDepreciation * 100) / 100,
      currentBookValue: Math.round(currentBookValue * 100) / 100,
      accumulatedDepreciation: Math.round(accumulatedDepreciation * 100) / 100,
      remainingLife: Math.round(remainingLife * 10) / 10,
    };
  }

  calculateDecliningBalance(input: DepreciationInput, rate = 2): DepreciationResult {
    const { purchasePrice, salvageValue, usefulLife, purchaseDate } = input;
    const now = new Date();
    const yearsOwned = (now.getTime() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const annualRate = rate / usefulLife;
    let currentBookValue = purchasePrice;
    let accumulatedDepreciation = 0;

    for (let year = 0; year < Math.floor(yearsOwned); year++) {
      const depreciation = Math.min(currentBookValue * annualRate, currentBookValue - salvageValue);
      accumulatedDepreciation += depreciation;
      currentBookValue -= depreciation;
      if (currentBookValue <= salvageValue) {
        currentBookValue = salvageValue;
        break;
      }
    }

    const remainingMonths = (yearsOwned - Math.floor(yearsOwned)) * 12;
    if (remainingMonths > 0 && currentBookValue > salvageValue) {
      const partialDepreciation = (currentBookValue * annualRate) * (remainingMonths / 12);
      const cappedPartial = Math.min(partialDepreciation, currentBookValue - salvageValue);
      accumulatedDepreciation += cappedPartial;
      currentBookValue -= cappedPartial;
    }

    const annualDepreciation = (purchasePrice - salvageValue) / usefulLife;
    const remainingLife = Math.max(0, usefulLife - yearsOwned);

    return {
      annualDepreciation: Math.round(annualDepreciation * 100) / 100,
      monthlyDepreciation: Math.round(annualDepreciation / 12 * 100) / 100,
      currentBookValue: Math.round(currentBookValue * 100) / 100,
      accumulatedDepreciation: Math.round(accumulatedDepreciation * 100) / 100,
      remainingLife: Math.round(remainingLife * 10) / 10,
    };
  }
}
