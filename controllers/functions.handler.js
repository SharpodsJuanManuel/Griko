const WooCommerceAPI = require('woocommerce-api');
const UsedEmail = require('../models/UsedEmail');

const WooCommerce = new WooCommerceAPI({
  url: 'https://www.sharpods.com/',
  consumerKey: 'ck_f02ace259e6b96e2c395cdb46e4c709700279213',
  consumerSecret: 'cs_f22ccf75d96e375ecec1fea0ef6b133ad8f95840',
  wpAPI: true,
  version: 'wc/v3',
  queryStringAuth: true
});

async function getAllCentauriMembershipMembers() {
  let members = [];
  let page = 1;
  let totalPages = 1;

  try {
    do {
      console.log(`Fetching centauri membership members page ${page}`);
      const response = await WooCommerce.getAsync(`memberships/members?plan=griko-black&status=active&page=${page}&per_page=100`);
      const data = JSON.parse(response.toJSON().body);

      if (Array.isArray(data)) {
        members = members.concat(data);
      } else {
        console.error('Unexpected response format:', data);
        break;
      }

      totalPages = parseInt(response.headers['x-wp-totalpages'], 10);
      page++;

      // Add a delay between requests
      await delay(1000); // 1 second
    } while (page <= totalPages);
  } catch (error) {
    console.error('Error fetching centauri membership members:', error);
  }

  return members;
}

async function getCustomerEmail(customerId) {
  try {
    const response = await WooCommerce.getAsync(`customers/${customerId}`);
    const responseBody = response.toJSON().body;

    // Check if the response is HTML
    if (responseBody.startsWith('<!DOCTYPE html>')) {
      console.error(`Error fetching customer ${customerId}: Received HTML response instead of JSON`);
      return null;
    }

    const customer = JSON.parse(responseBody);
    return customer.email;
  } catch (error) {
    console.error(`Error fetching customer ${customerId}:, error`);
    return null;
  }
}

async function saveOrUpdateUsedEmail(email, isActive) {
  try {
    await UsedEmail.findOneAndUpdate(
      { email },
      { email, isActive },
      { upsert: true, new: true }
    );
    console.log(`Email ${email} has been inserted/updated.`);
  } catch (error) {
    console.error(`Error saving/updating email ${email}:, error`);
  }
}

async function savecentauriMemberEmails() {
  try {
    const members = await getAllCentauriMembershipMembers();

    console.log(`Total centauri memberships members fetched: ${members.length}`);

    for (let member of members) {
      const email = await getCustomerEmail(member.customer_id);
      console.log(`Checking email for customer ID ${member.customer_id}: ${email}`);
      
      if (email) {
        await saveOrUpdateUsedEmail(email, true);
      }

      // Add a delay between requests
      await delay(1000); // 1 second
    }
  } catch (error) {
    console.error('Error fetching members:', error);
  }
}

// Function to add a delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  await savecentauriMemberEmails();
  await delay(30000); // Wait 30 seconds to allow console inspection
}

main();