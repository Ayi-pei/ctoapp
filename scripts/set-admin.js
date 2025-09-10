
// Usage: node scripts/set-admin.js <user_email>
// Example: node scripts/set-admin.js admin@example.com

const admin = require('firebase-admin');

// IMPORTANT: Initialize the app with your service account credentials
// Make sure you have the 'firebase-service-account.json' file in your project root
// or set up the GOOGLE_APPLICATION_CREDENTIALS environment variable.
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const userEmail = process.argv[2];

if (!userEmail) {
  console.error('Error: Please provide the user\'s email as an argument.');
  process.exit(1);
}

async function setAdminClaim(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    const currentClaims = user.customClaims || {};

    if (currentClaims.admin === true) {
      console.log(`User ${email} is already an admin.`);
      return;
    }

    await admin.auth().setCustomUserClaims(user.uid, { ...currentClaims, admin: true });
    console.log(`Success! User ${email} (UID: ${user.uid}) has been granted admin privileges.`);
    console.log('The user may need to log out and log back in for the changes to take effect.');

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`Error: User with email ${email} not found.`);
    } else {
      console.error('An unexpected error occurred:', error);
    }
    process.exit(1);
  }
}

setAdminClaim(userEmail);
