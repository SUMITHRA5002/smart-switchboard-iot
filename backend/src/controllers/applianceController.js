const db = require('../db/database');

const ALLOWED_CATEGORIES = [
  'General',
  'Cooling',
  'Kitchen',
  'Heating',
  'Lighting',
  'Entertainment',
  'Cleaning',
  'Office',
  'Other'
];

/**
 * Controller: getAppliances
 * Returns all configured appliances and channels
 */
exports.getAppliances = async (req, res) => {
  try {
    const query = `
      SELECT 
        id, 
        channel_id, 
        name, 
        category, 
        power_threshold_w, 
        is_active, 
        created_at 
      FROM appliances 
      ORDER BY channel_id ASC
    `;
    const appliances = await db.allAsync(query);

    return res.status(200).json({
      status: 'success',
      count: appliances.length,
      allowed_categories: ALLOWED_CATEGORIES,
      data: appliances
    });
  } catch (error) {
    console.error('Error fetching appliances:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch appliances',
      error: error.message
    });
  }
};

/**
 * Controller: updateAppliance
 * Updates name, category, and safety threshold for a specific channel
 */
exports.updateAppliance = async (req, res) => {
  try {
    const channelId = parseInt(req.params.channel_id, 10);
    const { name, category, power_threshold_w, is_active } = req.body;
    const errors = [];

    // 1. Validate Channel ID
    if (isNaN(channelId) || channelId <= 0) {
      errors.push('Invalid channel_id. Must be a positive integer.');
    }

    // 2. Validate Appliance Name
    if (!name || typeof name !== 'string') {
      errors.push('Field "name" is required and must be a string.');
    } else {
      const trimmedName = name.trim();
      if (trimmedName.length < 2 || trimmedName.length > 50) {
        errors.push('Appliance name must be between 2 and 50 characters.');
      }
    }

    // 3. Validate Power Threshold
    let thresholdNum = undefined;
    if (power_threshold_w !== undefined && power_threshold_w !== null) {
      thresholdNum = parseFloat(power_threshold_w);
      if (isNaN(thresholdNum) || thresholdNum < 10 || thresholdNum > 10000) {
        errors.push('Field "power_threshold_w" must be a positive number between 10 W and 10,000 W.');
      }
    }

    // 4. Validate Category
    let cleanCategory = category || 'General';
    if (category && !ALLOWED_CATEGORIES.includes(category)) {
      errors.push(`Invalid category "${category}". Allowed categories: ${ALLOWED_CATEGORIES.join(', ')}`);
    }

    if (errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors
      });
    }

    // Check if appliance exists
    const existing = await db.getAsync('SELECT * FROM appliances WHERE channel_id = ?', [channelId]);
    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: `Appliance with channel_id ${channelId} not found.`
      });
    }

    const updatedName = name.trim();
    const updatedCategory = cleanCategory;
    const updatedThreshold = thresholdNum !== undefined ? thresholdNum : existing.power_threshold_w;
    const updatedActive = is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active;

    await db.runAsync(`
      UPDATE appliances 
      SET 
        name = ?, 
        category = ?, 
        power_threshold_w = ?, 
        is_active = ?
      WHERE channel_id = ?
    `, [
      updatedName,
      updatedCategory,
      updatedThreshold,
      updatedActive,
      channelId
    ]);

    const updated = await db.getAsync('SELECT * FROM appliances WHERE channel_id = ?', [channelId]);

    return res.status(200).json({
      status: 'success',
      message: `Appliance #${channelId} configuration updated successfully`,
      data: updated
    });
  } catch (error) {
    console.error('Error updating appliance:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update appliance configuration',
      error: error.message
    });
  }
};
