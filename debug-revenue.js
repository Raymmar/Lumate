import fetch from 'node-fetch';

async function fetchRevenueData() {
  try {
    // You'll need to be logged in as admin to access this endpoint
    console.log('Fetching revenue data...');
    
    const response = await fetch('http://localhost:3000/api/stripe/revenue', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.error('Error fetching revenue data:', response.status, response.statusText);
      return null;
    }
    
    const data = await response.json();
    console.log('Revenue data structure:');
    console.log(JSON.stringify(data, null, 2));
    
    // Log the individual price items
    if (data.revenueByPrice) {
      console.log('\nRevenue breakdown by price:');
      data.revenueByPrice.forEach((item, index) => {
        console.log(`Item ${index + 1}:`);
        console.log(`  Name: ${item.nickname || item.productName || 'Unknown'}`);
        console.log(`  Unit Price: $${item.unitAmount?.toFixed(2) || 'N/A'}`);
        console.log(`  Active Subscriptions: ${item.subscriptionCount}`);
        console.log(`  Revenue: $${item.revenue.toFixed(2)}`);
      });
    }
    
    // Calculate expected subscription revenue
    const activeSubRevenue = data.revenueByPrice?.reduce((sum, item) => {
      return sum + (item.unitAmount || 0) * item.subscriptionCount;
    }, 0) || 0;
    
    console.log('\nCalculated values:');
    console.log(`Total Revenue (from API): $${data.totalRevenue.toFixed(2)}`);
    console.log(`Expected Active Subscription Revenue: $${activeSubRevenue.toFixed(2)}`);
    console.log(`Difference: $${(data.totalRevenue - activeSubRevenue).toFixed(2)}`);
    
    return data;
  } catch (error) {
    console.error('Error in fetchRevenueData:', error);
    return null;
  }
}

fetchRevenueData().catch(console.error);