/**
 * Middleware: validateTelemetry
 * Validates incoming JSON payload for POST /api/telemetry from the ESP32
 */
function validateTelemetry(req, res, next) {
  const { device_id, readings } = req.body;
  const errors = [];

  // Check device_id
  if (!device_id || typeof device_id !== 'string' || device_id.trim() === '') {
    errors.push('Field "device_id" is required and must be a non-empty string.');
  }

  // Check readings array
  if (!readings || !Array.isArray(readings) || readings.length === 0) {
    errors.push('Field "readings" is required and must be a non-empty array.');
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors
    });
  }

  // Validate each reading in the array
  readings.forEach((item, index) => {
    const prefix = `Reading #${index + 1} (Channel ${item?.channel || 'Unknown'})`;

    // Channel validation
    if (item.channel === undefined || item.channel === null || typeof item.channel !== 'number' || !Number.isInteger(item.channel) || item.channel <= 0) {
      errors.push(`${prefix}: "channel" must be a positive integer (e.g. 1 or 2).`);
    }

    // Numerical parameter validations
    const fields = [
      { name: 'voltage', min: 0, max: 500 },
      { name: 'current', min: 0, max: 100 },
      { name: 'power', min: 0, max: 50000 },
      { name: 'energy', min: 0, max: 1000000 },
      { name: 'frequency', min: 0, max: 100 },
      { name: 'power_factor', min: 0, max: 1.0 }
    ];

    fields.forEach(field => {
      const val = item[field.name];
      if (val === undefined || val === null || typeof val !== 'number' || isNaN(val)) {
        errors.push(`${prefix}: "${field.name}" is required and must be a valid number.`);
      } else if (val < field.min || val > field.max) {
        errors.push(`${prefix}: "${field.name}" value (${val}) is out of realistic range [${field.min}, ${field.max}].`);
      }
    });
  });

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Telemetry payload validation failed',
      errors
    });
  }

  next();
}

module.exports = validateTelemetry;
