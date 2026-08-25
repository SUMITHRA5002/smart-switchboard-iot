async function runTests() {
  console.log('=== Starting Phase 2 Telemetry API Tests ===\n');

  // Test 1: Health Check
  const healthRes = await fetch('http://localhost:5000/api/health');
  const healthData = await healthRes.json();
  console.log('[Test 1] Health Check:', healthData);

  // Test 2: Valid Dual-Channel Telemetry Ingestion (PZEM 1 & PZEM 2 Real Readings)
  const validPayload = {
    device_id: 'esp32_switchboard_01',
    readings: [
      {
        channel: 1,
        voltage: 236.5,
        current: 0.11,
        power: 11.3,
        energy: 0.00,
        frequency: 50.0,
        power_factor: 0.43
      },
      {
        channel: 2,
        voltage: 237.9,
        current: 0.13,
        power: 13.8,
        energy: 0.00,
        frequency: 49.9,
        power_factor: 0.44
      }
    ]
  };

  const postRes = await fetch('http://localhost:5000/api/telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validPayload)
  });

  const postData = await postRes.json();
  console.log('\n[Test 2] POST /api/telemetry (Valid Data):');
  console.log('Status Code:', postRes.status);
  console.log('Response:', JSON.stringify(postData, null, 2));

  // Test 3: Validation Error Handling (Missing channel and invalid negative voltage)
  const invalidPayload = {
    device_id: 'esp32_switchboard_01',
    readings: [
      {
        voltage: -10.0,
        current: 0.11,
        power: 11.3,
        energy: 0.00,
        frequency: 50.0,
        power_factor: 1.5 // out of range
      }
    ]
  };

  const invalidRes = await fetch('http://localhost:5000/api/telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invalidPayload)
  });

  const invalidData = await invalidRes.json();
  console.log('\n[Test 3] POST /api/telemetry (Invalid Data Rejection):');
  console.log('Status Code:', invalidRes.status);
  console.log('Response:', JSON.stringify(invalidData, null, 2));

  // Test 4: Retrieve Stored Snapshot from SQLite Database
  const latestRes = await fetch('http://localhost:5000/api/telemetry/latest');
  const latestData = await latestRes.json();
  console.log('\n[Test 4] GET /api/telemetry/latest (Stored in SQLite):');
  console.log('Status Code:', latestRes.status);
  console.log('Response:', JSON.stringify(latestData, null, 2));

  console.log('\n=== All Tests Finished ===');
}

runTests().catch(console.error);
