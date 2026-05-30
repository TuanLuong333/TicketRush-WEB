const { AppError } = require('./errors');

function toPositiveInteger(value, fieldName = 'id') {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} không hợp lệ`, 400);
  }

  return parsed;
}

function uniquePositiveIntegers(values, fieldName = 'ids') {
  if (!Array.isArray(values) || values.length === 0) {
    throw new AppError(`${fieldName} phải là mảng không rỗng`, 400);
  }

  const ids = [...new Set(values.map((value) => toPositiveInteger(value, fieldName)))];
  ids.sort((a, b) => a - b);
  return ids;
}

module.exports = {
  toPositiveInteger,
  uniquePositiveIntegers
};
