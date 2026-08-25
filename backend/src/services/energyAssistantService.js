const db = require('../db/database');
const { 
  generateEnergyIntelligence, 
  computeApplianceRanking, 
  simulateSavings,
  DEFAULT_GRID_EMISSION_FACTOR,
  DEFAULT_TARIFF
} = require('./energyRecommendationService');

/**
 * Clean & classify intent from user query text
 */
function detectIntent(message = '') {
  const text = message.toLowerCase().trim();

  if (!text || text.length === 0) return 'help';

  // 1. Highest Consumption / Ranking
  if (
    text.includes('most energy') || 
    text.includes('highest') || 
    text.includes('top consumer') || 
    text.includes('most power') || 
    text.includes('biggest consumer') || 
    text.includes('heaviest') || 
    text.includes('ranking') ||
    text.includes('which appliance consumes the most') ||
    text.includes('who uses most')
  ) {
    return 'highest_consumption';
  }

  // 2. Active Anomalies / Alerts
  if (
    text.includes('anomal') || 
    text.includes('alert') || 
    text.includes('surge') || 
    text.includes('warning') || 
    text.includes('fault') || 
    text.includes('danger') ||
    text.includes('over-power') ||
    text.includes('over power') ||
    text.includes('threshold exceeded')
  ) {
    return 'active_anomalies';
  }

  // 3. Carbon Footprint & Environmental Impact
  if (
    text.includes('carbon') || 
    text.includes('co2') || 
    text.includes('emission') || 
    text.includes('footprint') || 
    text.includes('tree') || 
    text.includes('eco') || 
    text.includes('environment') ||
    text.includes('green')
  ) {
    return 'carbon_footprint';
  }

  // 4. Recommendations & Saving Opportunities
  if (
    text.includes('how can i reduce') ||
    text.includes('how to reduce') ||
    text.includes('reduce my bill') ||
    text.includes('reduce bill') ||
    text.includes('reduce electricity bill') ||
    text.includes('recommend') || 
    text.includes('how can i save') || 
    text.includes('how to save') || 
    text.includes('saving opportunit') || 
    text.includes('tips') || 
    text.includes('cut electricity') || 
    text.includes('save electricity') ||
    text.includes('ways to save')
  ) {
    return 'recommendations';
  }

  // 5. Savings Simulation & What-If Guidance
  if (
    text.includes('what happens if') || 
    text.includes('if i reduce') || 
    text.includes('if i turn off') || 
    text.includes('simulate') || 
    text.includes('hours saved') || 
    text.includes('hours less') ||
    text.includes('savings guidance')
  ) {
    return 'savings_guidance';
  }

  // 6. Projected Bill & Costs
  if (
    text.includes('projected bill') || 
    text.includes('monthly bill') || 
    text.includes('estimated bill') || 
    text.includes('electricity bill') || 
    text.includes('how much will i pay') || 
    text.includes('bill forecast') ||
    text.includes('bill') ||
    text.includes('cost') ||
    text.includes('tariff') ||
    text.includes('charges')
  ) {
    return 'projected_bill';
  }

  // 7. Appliance Optimization
  if (
    text.includes('optimize') || 
    text.includes('which appliance should i') || 
    text.includes('efficiency') || 
    text.includes('improve appliance') ||
    text.includes('tune')
  ) {
    return 'appliance_optimization';
  }

  // 8. General Energy Summary
  if (
    text.includes('summary') || 
    text.includes('overview') || 
    text.includes('current energy') || 
    text.includes('total energy') || 
    text.includes('how much power') || 
    text.includes('current load') || 
    text.includes('status') ||
    text.includes('telemetry')
  ) {
    return 'energy_summary';
  }

  // 9. Help / Capabilities
  if (
    text.includes('help') || 
    text.includes('what can you do') || 
    text.includes('who are you') || 
    text.includes('commands') || 
    text.includes('capabilities')
  ) {
    return 'help';
  }

  // Default fallback
  return 'general';
}

/**
 * Process a user message and generate a data-aware, grounded response
 */
async function processAssistantQuery({ message, tariff = DEFAULT_TARIFF, emissionFactor = DEFAULT_GRID_EMISSION_FACTOR }) {
  const intent = detectIntent(message);

  // 1. Check data availability in database
  const countRow = await db.getAsync('SELECT COUNT(id) AS count FROM energy_readings');
  const readingCount = parseInt(countRow?.count || 0, 10);

  if (readingCount === 0 && intent !== 'help') {
    return {
      success: true,
      intent: intent,
      answer: "Not enough energy data is available yet to provide a reliable answer. Please connect the hardware or generate test telemetry to start analyzing consumption.",
      data: { reading_count: 0 },
      suggested_questions: [
        "What can you do?",
        "How do I configure my appliances?",
        "What is the configured tariff rate?"
      ]
    };
  }

  // 2. Fetch real data from existing services
  const [intelligence, ranking, activeAlerts] = await Promise.all([
    generateEnergyIntelligence({ tariff, emissionFactor }),
    computeApplianceRanking({ tariff, emissionFactor }),
    db.allAsync('SELECT * FROM alerts WHERE is_resolved = 0 ORDER BY id DESC')
  ]);

  const summary = intelligence.summary;
  const appliances = intelligence.appliances || [];
  const recs = intelligence.recommendations || [];
  const topAppliance = ranking.appliances && ranking.appliances.length > 0 ? ranking.appliances[0] : null;

  let answer = "";
  let payloadData = {};
  let suggestedQuestions = [];

  switch (intent) {
    case 'highest_consumption': {
      if (topAppliance) {
        answer = `Your highest energy-consuming appliance is the **${topAppliance.appliance}** (Channel ${topAppliance.channel_id}). It accounts for **${topAppliance.contribution_percent}%** of your total household energy consumption, with a projected monthly consumption of **${topAppliance.monthly_kwh} kWh** (approx. **₹${topAppliance.monthly_cost.toFixed(2)}/month**).`;
        payloadData = {
          appliance: topAppliance.appliance,
          channel_id: topAppliance.channel_id,
          share_percent: topAppliance.contribution_percent,
          monthly_kwh: topAppliance.monthly_kwh,
          monthly_cost: topAppliance.monthly_cost
        };
        suggestedQuestions = [
          `How can I reduce ${topAppliance.appliance} consumption?`,
          "What is my projected monthly bill?",
          "What is my current carbon footprint?"
        ];
      } else {
        answer = "No active appliances were found in the system.";
        suggestedQuestions = ["Summarize my current energy usage.", "What can you do?"];
      }
      break;
    }

    case 'active_anomalies': {
      const activeCount = activeAlerts.length;
      if (activeCount > 0) {
        const alertSummaries = activeAlerts.map(a => `• Channel ${a.channel_id} (${a.appliance_name}): **${a.alert_type}** (${a.trigger_value} ${a.unit || 'W'}, ${a.severity})`).join('\n');
        answer = `⚠️ You currently have **${activeCount} active anomaly alert(s)** detected:\n\n${alertSummaries}\n\nPlease inspect these appliances or check the Alerts Center to acknowledge them.`;
        payloadData = { active_alerts_count: activeCount, alerts: activeAlerts };
        suggestedQuestions = [
          "Which appliance should I optimize first?",
          "What is my projected monthly bill?",
          "Show my top recommendations"
        ];
      } else {
        answer = "✅ All monitored appliances are currently operating safely. There are **zero active anomalies or power surge alerts** at this time.";
        payloadData = { active_alerts_count: 0 };
        suggestedQuestions = [
          "Which appliance consumes the most energy?",
          "What is my projected monthly bill?",
          "Show my carbon footprint"
        ];
      }
      break;
    }

    case 'carbon_footprint': {
      const totalCo2 = summary.total_monthly_projected_co2_kg || 0;
      const treesNeeded = Math.max(1, Math.round(totalCo2 / 1.81));
      const potentialCo2Saved = summary.potential_monthly_savings_co2_kg || 0;

      answer = `Your switchboard's projected monthly carbon footprint is **${totalCo2} kg CO₂** (calculated at a grid baseline of ${emissionFactor} kg CO₂/kWh). It takes approximately **${treesNeeded} mature tree-months** to absorb these emissions.\n\nBy following our recommendations, you can reduce this by **${potentialCo2Saved} kg CO₂/month**!`;
      payloadData = {
        monthly_co2_kg: totalCo2,
        grid_emission_factor: emissionFactor,
        trees_needed_monthly: treesNeeded,
        potential_co2_reduction_kg: potentialCo2Saved
      };
      suggestedQuestions = [
        "Which appliance produces the most CO2?",
        "How can I save electricity?",
        "What is my projected monthly bill?"
      ];
      break;
    }

    case 'projected_bill': {
      const monthlyKwh = summary.total_monthly_projected_kwh || 0;
      const monthlyCost = summary.total_monthly_projected_cost || 0;
      const measuredKwh = summary.total_measured_energy_kwh || 0;

      answer = `Based on current telemetry, your **projected 30-day electricity consumption is ${monthlyKwh} kWh**, resulting in an estimated monthly bill of **₹${monthlyCost.toFixed(2)}** (at the rate of ₹${tariff.toFixed(2)}/kWh).\n\nTotal measured energy recorded so far is **${measuredKwh} kWh**.`;
      payloadData = {
        projected_monthly_kwh: monthlyKwh,
        projected_monthly_cost: monthlyCost,
        measured_energy_kwh: measuredKwh,
        tariff_rate: tariff
      };
      suggestedQuestions = [
        "How can I reduce my electricity bill?",
        "Which appliance consumes the most energy?",
        "What happens if I reduce my appliance usage?"
      ];
      break;
    }

    case 'recommendations': {
      if (recs.length > 0) {
        const topRecs = recs.slice(0, 3).map((r, i) => `${i + 1}. **${r.appliance}** (${r.severity}): ${r.title} — *${r.action_item}* (Saves ~₹${r.estimated_saving_cost.toFixed(2)}/mo)`).join('\n\n');
        answer = `Here are your top energy-saving opportunities:\n\n${topRecs}\n\nImplementing all top recommendations could save you up to **${summary.potential_monthly_savings_kwh} kWh/month** (approx. **₹${summary.potential_monthly_savings_cost.toFixed(2)}/month**).`;
        payloadData = {
          potential_monthly_savings_kwh: summary.potential_monthly_savings_kwh,
          potential_monthly_savings_cost: summary.potential_monthly_savings_cost,
          top_recommendations: recs.slice(0, 3)
        };
        suggestedQuestions = [
          "Which appliance consumes the most energy?",
          "What is my current carbon footprint?",
          "What is my projected monthly bill?"
        ];
      } else {
        answer = "Great job! All your appliances are currently operating within optimal energy-efficiency benchmarks.";
        suggestedQuestions = [
          "Summarize my current energy usage.",
          "Show my carbon footprint."
        ];
      }
      break;
    }

    case 'appliance_optimization': {
      if (topAppliance) {
        const topRec = recs.find(r => r.channel === topAppliance.channel_id) || recs[0];
        answer = `You should optimize your **${topAppliance.appliance}** first. It draws the highest load (${topAppliance.contribution_percent}% of total) with a projected cost of **₹${topAppliance.monthly_cost.toFixed(2)}/month**.\n\n**Actionable Step**: ${topRec ? topRec.action_item : 'Reduce daily continuous operating hours by 1.5–2 hours to achieve immediate bill reductions.'}`;
        payloadData = {
          appliance_to_optimize: topAppliance.appliance,
          channel_id: topAppliance.channel_id,
          monthly_cost: topAppliance.monthly_cost,
          recommended_action: topRec ? topRec.action_item : 'Schedule off-timers'
        };
        suggestedQuestions = [
          `What happens if I reduce ${topAppliance.appliance} usage by 2 hours?`,
          "What is my projected monthly bill?",
          "Show my top recommendations"
        ];
      } else {
        answer = "No appliances require immediate optimization.";
        suggestedQuestions = ["Summarize my current energy usage."];
      }
      break;
    }

    case 'savings_guidance': {
      const targetChannel = topAppliance ? topAppliance.channel_id : 1;
      const sim = await simulateSavings({
        channel: targetChannel,
        hoursSavedPerDay: 2.0,
        dailyHours: 8.0,
        tariff: tariff,
        emissionFactor: emissionFactor
      });

      answer = `Here is a simulation for your highest load (**${sim.simulation_inputs.appliance_name}**):\n\n${sim.summary_sentence}\n\n• **Monthly Savings**: ₹${sim.savings_projection.monthly_money_saved.toFixed(2)} (${sim.savings_projection.monthly_energy_saved_kwh} kWh)\n• **Annual Savings**: **₹${sim.savings_projection.annual_money_saved.toFixed(2)}/year**\n• **Annual CO₂ Avoided**: ${sim.savings_projection.annual_co2_reduction_kg} kg (~${sim.savings_projection.trees_offset_equivalent_yearly} trees)`;
      payloadData = sim.savings_projection;
      suggestedQuestions = [
        "How can I reduce my electricity bill?",
        "What is my current carbon footprint?",
        "Which appliance consumes the most energy?"
      ];
      break;
    }

    case 'energy_summary': {
      const activePower = summary.total_current_power_w || 0;
      const monthlyKwh = summary.total_monthly_projected_kwh || 0;
      const monthlyCost = summary.total_monthly_projected_cost || 0;
      const topConsumerText = topAppliance ? `${topAppliance.appliance} (${topAppliance.contribution_percent}%)` : 'None';

      answer = `📊 **Energy Summary Overview**:\n• **Current Active Load**: ${activePower} W\n• **Total Measured Energy**: ${summary.total_measured_energy_kwh || 0} kWh\n• **Projected Monthly Usage**: ${monthlyKwh} kWh (~₹${monthlyCost.toFixed(2)})\n• **Top Energy Consumer**: ${topConsumerText}\n• **Active Anomalies**: ${activeAlerts.length} alert(s)\n• **Monthly Carbon Footprint**: ${summary.total_monthly_projected_co2_kg || 0} kg CO₂`;
      payloadData = summary;
      suggestedQuestions = [
        "Which appliance consumes the most energy?",
        "How can I save electricity?",
        "Are there any active energy anomalies?"
      ];
      break;
    }

    case 'help':
    default: {
      answer = "Hi! I'm your **Smart Switchboard Energy Assistant**. I can analyze your real-time PZEM sensor data, identify high-consuming appliances, calculate monthly bill projections, estimate carbon emissions, and find direct savings opportunities.\n\nTry asking one of the questions below:";
      payloadData = { supported_intents: [
        'highest_consumption', 
        'energy_summary', 
        'recommendations', 
        'projected_bill', 
        'carbon_footprint', 
        'appliance_optimization', 
        'active_anomalies', 
        'savings_guidance'
      ]};
      suggestedQuestions = [
        "Which appliance consumes the most energy?",
        "What is my projected monthly bill?",
        "How can I save electricity?",
        "Show my carbon footprint",
        "Are there any active energy anomalies?"
      ];
      break;
    }
  }

  return {
    success: true,
    intent: intent,
    answer: answer,
    data: payloadData,
    suggested_questions: suggestedQuestions
  };
}

module.exports = {
  processAssistantQuery,
  detectIntent
};
