/* eslint-disable no-console */
const { connectToDatabase } = require('../config/db');
const { Home } = require('../models/Home');
const { v4: uuidv4 } = require('uuid');

// Map ledger descriptions to trade names in the Home document
const DESCRIPTION_TO_TRADE = [
  ['Lot', 'Lot'],
  ['Builder Fee', 'Builder Fee'],
  ['Designer', 'Designer'],
  ['Architect', 'Architect'],
  ['Soil Test', 'Soil Test'],
  ['Structural Engg', 'Structural Engineering'],
  ['Structural Engg Kabir', 'Structural Engineering'],
  ['Wilhitt Land Survey', 'Land Survey'],
  ['Whilhitt Land Survey', 'Land Survey'],
  ['United Service (Potty)', 'Site Services - Portable Toilet'],
  ['United Service (Fence)', 'Site Fence'],
  ['Retaining Wall', 'Retaining Wall'],
  ['Foundation', 'Foundation'],
  ['Lot cleaning', 'Lot Cleaning / Concrete Wash'],
  ['Concrete wash', 'Lot Cleaning / Concrete Wash'],
  ['Framer', 'Framing'],
  ['Steel IBeams Framing', 'Steel I-Beams (Framing)'],
  ['House Permit City', 'House Permit (City)'],
  ['Electricals', 'Electrical'],
  ['Electrical', 'Electrical'],
  ['Plumber', 'Plumbing'],
  ['HVAC', 'HVAC'],
  ['Stairs', 'Stairs'],
  ['Lumber Package', 'Lumber Package'],
  ['framing fixes', 'Framing Fixes / Extra Lumber'],
  ['extra lumber for fixes', 'Framing Fixes / Extra Lumber'],
  ['Extra lumber', 'Framing Fixes / Extra Lumber'],
  ['Roof Contractor', 'Roof Contractor'],
  ['Stucco', 'Stucco'],
  ['Stone Work', 'Stone Work'],
  ['Fire Sprinkler', 'Fire Sprinkler'],
  ['Insulation', 'Insulation'],
  ['Pella Windows', 'Windows (Pella / Iron)'],
  ['Windows (Pella', 'Windows (Pella / Iron)'],
  ['Exterior trim paint', 'Exterior Trim Paint'],
  ['Flatwork', 'Flatwork (Concrete)'],
  ['Landscaping', 'Landscaping'],
  ['Landscape Design', 'Landscape Design'],
  ['Fireplace', 'Fireplace'],
  ['Paint', 'Paint (Interior)'],
  ['Interior Doors', 'Interior Doors'],
  ['Counter Tops', 'Countertops'],
  ['Countertops', 'Countertops'],
  ['Drywalls', 'Drywalls'],
  ['Debris removal', 'Lot Cleaning / Concrete Wash'],
  ['Termite Control', 'Termite Control'],
  ['Builder Risk Insurance', 'Builder Risk Insurance'],
  ['Security Camera', 'Security Camera'],
  ['Pool', 'Pool'],
  ['Love That Door', 'Love That Door'],
  ['Garages', 'Garages'],
  ['Big Horn Iron Doors', 'Big Horn Iron Doors'],
  ['Big Horn Iron Windows', 'Big Horn Iron Windows'],
  ['Gutters', 'Gutters'],
  ['Appliances (StarPower)', 'Appliances'],
  ['Appliances', 'Appliances'],
  ['Appliance Install', 'Appliance Install'],
  ['Door Installation', 'Door Installation'],
  ['Faucets/Fixtures', 'Faucets / Fixtures'],
  ['Faucets / Fixtures', 'Faucets / Fixtures'],
];

// Raw ledger pasted; you can edit or extend this list.
// Fields: date, description, total, paid, remaining, method, comments
const LEDGER = [
  ['02/15/2021', 'Lot', 255000, 255000, 0, 'Bofa', 'Paid for lot from Bofa'],
  ['02/15/2021', 'Builder Fee', 45426, 37000, 8426, 'Bofa', '1500, 18210.40'],
  ['02/15/2021', 'Designer Steve White', 3700, 3700, 0, 'Bofa', ''],
  ['02/15/2021', 'Architect Kumar', 10000, 10000, 0, 'Bofa', '5000, 2500, 2500'],
  ['02/15/2021', 'Soil Test', 1740, 1740, 0, 'Bofa', 'Total Paid'],
  ['02/15/2021', 'Structural Engg Kabir', 4800, 4800, 0, 'Bofa', 'Total Paid'],
  ['01/20/2023', 'Wilhitt Land Survey', 189, 189, 0, 'Amex', 'Foam Board survey'],
  ['01/15/2023', 'United Service (Potty)', 1600, 580, 1020, 'Amex', 'Monthly'],
  ['01/12/2023', 'United Service (Fence)', 2200, 2200, 0, '', ''],
  ['01/10/2023', 'Whilhitt Land Survey', 216, 216, 0, 'Amex', 'Corner Survey'],
  ['03/13/2022', 'Appliances (StarPower)', 23669.94, 23669.94, 0, 'Amex', '2780 + 3760, prosperity check and bofa check'],
  ['03/13/2022', 'Big Horn Iron Doors', 17306, 17306, 0, '', ''],
  ['03/13/2022', 'Big Horn Iron Windows', 34936, 34936, 0, '', ''],
  ['08/20/2022', 'Lowers TakeOff', 620, 620, 0, 'Amex', ''],
  ['04/05/2023', 'Watermeter', 14375.15, 14375.15, 0, 'Bofa', ''],
  ['10/10/2022', 'SWPPP Pros', 1353, 1353, 0, 'Amex', 'Storm Prevention'],
  ['01/20/2023', 'Foundation', 67044.65, 67044.65, 0, '', ''],
  ['01/20/2023', 'Lot cleaning, Concrete wash', 1050, 1050, 0, '', ''],
  ['01/20/2023', 'Framer', 51000, 51000, 0, '', ''],
  ['01/20/2023', 'Steel IBeams Framing', 12500, 12500, 0, '', ''],
  ['01/20/2023', 'House Permit City of Allen', 4368.12, 4368.12, 0, 'Bofa', 'City Permits'],
  ['01/20/2023', 'Electricals', 30000, 23529, 6471, '', ''],
  ['01/20/2023', 'Plumber', 35000, 14000, 21000, '', ''],
  ['01/20/2023', 'HVAC', 39000, 17000, 22000, '', ''],
  ['01/20/2023', 'Stairs', 35700, 32700, 3000, '', ''],
  ['01/20/2023', 'Lumber Package', 92000, 92000, 0, '', 'Total paid'],
  ['01/20/2023', 'Extra lumber', 2400, 2400, 0, '', "From Lowe's and Oldham; Tarps paid to Walt"],
  ['06/01/2023', 'Roof Contractor', 91195, 91195, 0, 'prosperity builder account', 'gave checks to Daniel for material and labour'],
  ['11/03/2023', 'Stucco', 44500, 44500, 0, 'prosperity', '3 checks, Mark and Daniel company'],
  ['11/03/2023', 'Stone Work', 25000, 25000, 0, '', ''],
  ['11/03/2023', 'Fire Sprinkler', 8900, 8900, 0, '', ''],
  ['11/03/2023', 'Insulation', 17181, 17181, 0, '', ''],
  ['11/03/2023', 'Pella Windows', 15005, 15005, 0, '', ''],
  ['11/03/2023', 'Landscape Design', 600, 600, 0, '', ''],
  ['11/03/2023', 'hardwood Flooring', 43907, 43907, 0, '', ''],
  ['11/03/2023', 'Cabinets', 74480, 74480, 0, '', ''],
  ['11/03/2023', 'bathroom tiles', 51300, 51300, 0, '', ''],
  ['11/03/2023', 'Trim Work Material/Labor', 31840, 31840, 0, '', ''],
  ['11/03/2023', 'Faucets/Fixtures', 20000, 0, 20000, '', ''],
  ['11/03/2023', 'Fence', 9900, 9900, 0, '', ''],
  ['12/27/2023', 'Exterior trim paint', 5000, 5000, 0, 'prosperity + Bofa', 'check2000 and Bofa check3000'],
  ['12/27/2023', 'Flatwork', 17000, 0, 17000, '', ''],
  ['12/27/2023', 'Landscaping', 26600, 0, 26600, '', ''],
  ['04/28/2023', 'Fireplace', 10724, 10724, 0, '', ''],
  ['04/28/2023', 'Paint', 36160, 0, 36160, '', ''],
  ['04/28/2023', 'Interior Doors', 16018, 16018, 0, '', ''],
  ['04/28/2023', 'Counter Tops', 29247, 29247, 0, '', ''],
  ['04/28/2023', 'Drywalls', 38400, 38400, 0, '', ''],
  ['05/05/2023', 'Debris removal', 1600, 1600, 0, '', 'Paid to DFW Metro Junk'],
  ['05/17/2023', 'Termite Control', 2110.88, 2110.88, 0, '', ''],
  ['01/24/2023', 'Builder Risk Insurance', 4000, 4000, 0, '', 'Paid to US Assure'],
  ['01/24/2023', 'Security Camera', 1000, 1000, 0, '', ''],
  ['08/01/2023', 'framing fixes', 6000, 6000, 0, '', ''],
  ['08/01/2023', 'extra lumber for fixes', 1700, 1700, 0, '', ''],
  ['08/01/2023', 'Pool', 95500, 90000, 5500, '', ''],
  ['08/01/2023', 'Love That Door', 11878, 11878, 0, '', ''],
  ['08/01/2023', 'Garages', 16024, 16024, 0, '', ''],
  ['08/01/2023', 'ebay jennair microwave combo', 4356.3, 4356.3, 0, '', 'Appliance purchase'],
  ['08/01/2023', 'Gutters', 5040, 5040, 0, '', ''],
  ['08/01/2023', 'Appliance Install', 1100, 0, 1100, '', ''],
  ['08/01/2023', 'Door Installation', 1400, 0, 1400, '', ''],
];

function mapDescriptionToTrade(desc) {
  const entry = DESCRIPTION_TO_TRADE.find(([needle]) => desc.toLowerCase().includes(needle.toLowerCase()));
  return entry ? entry[1] : null;
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((s) => {
    const [k, v] = s.split('=');
    return [k.replace(/^--/, ''), v || ''];
  }));
  const homeId = args.homeId || process.env.HOME_ID || '';
  if (!homeId) {
    console.error('Usage: node src/scripts/applyCostsToHome.js --homeId=<HOME_ID>');
    process.exit(1);
  }
  const dryRun = args.dryRun === 'true' || args.dryRun === '1';

  await connectToDatabase();
  const home = await Home.findById(homeId);
  if (!home) {
    console.error('Home not found:', homeId);
    process.exit(1);
  }

  // Aggregate totals and payments per trade name
  const perTrade = new Map();
  for (const [date, description, total, paid] of LEDGER) {
    const tradeName = mapDescriptionToTrade(description || '');
    if (!tradeName) {
      console.warn('No trade mapping for description:', description);
      continue;
    }
    const key = tradeName;
    if (!perTrade.has(key)) {
      perTrade.set(key, { total: 0, paid: 0, lines: [] });
    }
    const entry = perTrade.get(key);
    entry.total += Number(total || 0);
    entry.paid += Number(paid || 0);
    entry.lines.push({ date, description, paid: Number(paid || 0) });
  }

  let updatedTrades = 0;
  for (const trade of home.trades || []) {
    const agg = perTrade.get(trade.name);
    if (!agg) continue;
    // Set total budget
    trade.totalPrice = Number(agg.total.toFixed(2));
    // Create paid invoices for each paid line to reflect paid sum in UI
    const invoices = trade.invoices || [];
    for (const line of agg.lines) {
      if (!line.paid || line.paid <= 0) continue;
      invoices.push({
        _id: uuidv4(),
        label: `${line.description} (${line.date})`,
        amount: Number(line.paid.toFixed(2)),
        dueDate: null,
        paid: true,
        paidAt: new Date(),
        createdAt: new Date(),
      });
    }
    trade.invoices = invoices;
    updatedTrades += 1;
  }

  if (!updatedTrades) {
    console.log('No matching trades were updated. Check your mappings.');
    process.exit(0);
  }

  if (dryRun) {
    console.log(`Dry run: would update ${updatedTrades} trades`);
    for (const trade of home.trades || []) {
      const agg = perTrade.get(trade.name);
      if (!agg) continue;
      console.log(`- ${trade.name}: totalPrice -> ${agg.total.toFixed(2)}, add paid invoices: ${agg.lines.filter(l => l.paid > 0).length}`);
    }
    process.exit(0);
  }

  await home.save();
  console.log(`Updated ${updatedTrades} trades on home ${home.name} (${home._id})`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


