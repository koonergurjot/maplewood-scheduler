import { datesInRange, isWeekday, applyPattern4on2off, applyPattern5on2off } from '../utils/date';

test('datesInRange returns inclusive ISO dates', () => {
  expect(datesInRange('2025-09-01', '2025-09-03')).toEqual([
    '2025-09-01','2025-09-02','2025-09-03'
  ])
})

test('isWeekday identifies Mon–Fri', () => {
  expect(isWeekday('2025-09-01')).toBe(true)   // Mon
  expect(isWeekday('2025-09-06')).toBe(false)  // Sat
})

test('4-on/2-off pattern selects correct count over 14 days', () => {
  const range = datesInRange('2025-09-01','2025-09-14')
  const picks = applyPattern4on2off(range)
  // In 14 days, cycles are 4 on + 2 off => 4,2,4,2,2 => 10 on, 4 off
  expect(picks.length).toBe(10)
})

test('5-on/2-off pattern selects correct count over 14 days', () => {
  const range = datesInRange('2025-09-01','2025-09-14')
  const picks = applyPattern5on2off(range)
  // 5,2,5,2 => 10 on, 4 off
  expect(picks.length).toBe(10)
})
