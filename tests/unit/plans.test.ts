import { describe, it, expect } from 'vitest';
import {
  PLAN_DEFINITIONS,
  PLAN_BY_KEY,
  getPlanLabel,
  getDefaultSeatsForPlan,
  type PlanKey,
} from '@/lib/plans';

describe('plans', () => {
  describe('PLAN_DEFINITIONS', () => {
    it('contains all 5 plan tiers', () => {
      expect(PLAN_DEFINITIONS).toHaveLength(5);
      const keys = PLAN_DEFINITIONS.map(p => p.key);
      expect(keys).toEqual(['free', 'standard', 'teams_free', 'teams', 'enterprise']);
    });

    it('every plan has required fields', () => {
      for (const plan of PLAN_DEFINITIONS) {
        expect(plan.key).toBeTruthy();
        expect(plan.name).toBeTruthy();
        expect(plan.description).toBeTruthy();
        expect(plan.features.length).toBeGreaterThan(0);
        expect(plan.cta).toBeTruthy();
      }
    });

    it('free plans have $0 price', () => {
      const free = PLAN_BY_KEY['free'];
      const teamsFree = PLAN_BY_KEY['teams_free'];
      expect(free.monthlyPrice).toBe(0);
      expect(teamsFree.monthlyPrice).toBe(0);
    });

    it('paid plans have positive prices', () => {
      expect(PLAN_BY_KEY['standard'].monthlyPrice).toBe(9);
      expect(PLAN_BY_KEY['teams'].monthlyPrice).toBe(15);
    });

    it('enterprise has null price (custom)', () => {
      expect(PLAN_BY_KEY['enterprise'].monthlyPrice).toBeNull();
    });

    it('billingEnabled is only set on paid plans', () => {
      expect(PLAN_BY_KEY['free'].billingEnabled).toBeFalsy();
      expect(PLAN_BY_KEY['standard'].billingEnabled).toBe(true);
      expect(PLAN_BY_KEY['teams_free'].billingEnabled).toBeFalsy();
      expect(PLAN_BY_KEY['teams'].billingEnabled).toBe(true);
      expect(PLAN_BY_KEY['enterprise'].billingEnabled).toBeFalsy();
    });

    it('teams_free has includedSeats of 5', () => {
      expect(PLAN_BY_KEY['teams_free'].includedSeats).toBe(5);
    });
  });

  describe('PLAN_BY_KEY', () => {
    it('maps every plan key to its definition', () => {
      for (const plan of PLAN_DEFINITIONS) {
        expect(PLAN_BY_KEY[plan.key]).toBe(plan);
      }
    });

    it('returns undefined for invalid keys', () => {
      expect((PLAN_BY_KEY as any)['nonexistent']).toBeUndefined();
    });
  });

  describe('getPlanLabel', () => {
    it('returns "Free" for null/undefined', () => {
      expect(getPlanLabel(null)).toBe('Free');
      expect(getPlanLabel(undefined)).toBe('Free');
      expect(getPlanLabel('')).toBe('Free');
    });

    it('returns shortName when available', () => {
      expect(getPlanLabel('teams_free')).toBe('Team Free');
    });

    it('returns name when no shortName', () => {
      expect(getPlanLabel('standard')).toBe('Standard');
      expect(getPlanLabel('enterprise')).toBe('Enterprise');
    });

    it('returns raw key for unknown plan', () => {
      expect(getPlanLabel('unknown_plan')).toBe('unknown_plan');
    });
  });

  describe('getDefaultSeatsForPlan', () => {
    it('returns 5 for teams_free', () => {
      expect(getDefaultSeatsForPlan('teams_free')).toBe(5);
    });

    it('returns 1 for all other plans', () => {
      const otherPlans: PlanKey[] = ['free', 'standard', 'teams', 'enterprise'];
      for (const plan of otherPlans) {
        expect(getDefaultSeatsForPlan(plan)).toBe(1);
      }
    });
  });
});
