/**
 * Script to verify required environment variables and generate NEXTAUTH_SECRET
 * Run with: node scripts/verify-env.js
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Required environment variables
const requiredVars = [
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL', 
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_GEMINI_API_KEY'
];

// Function to generate a secure random string
function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// Check environment file
function checkEnvFile(filename) {
  console.log(`Checking ${filename}...`);
  
  const envPath = path.join(process.cwd(), filename);
  let envVars = {};
  
  // Read existing .env file if it exists
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        if (key && value) {
          envVars[key.trim()] = value.trim();
        }
      }
    });
  }
  
  // Check for missing variables
  let missingVars = [];
  let envUpdated = false;
  
  requiredVars.forEach(varName => {
    if (!envVars[varName] && !process.env[varName]) {
      missingVars.push(varName);
      
      // Auto-generate NEXTAUTH_SECRET if missing
      if (varName === 'NEXTAUTH_SECRET') {
        envVars[varName] = generateSecret();
        console.log(`Generated new NEXTAUTH_SECRET`);
        envUpdated = true;
      }
    }
  });
  
  // Write updated .env file if needed
  if (envUpdated) {
    let envContent = '';
    Object.keys(envVars).forEach(key => {
      envContent += `${key}=${envVars[key]}\n`;
    });
    
    fs.writeFileSync(envPath, envContent);
    console.log(`Updated ${filename} with generated values`);
  }
  
  // Show status
  return {
    filename,
    missingVars: missingVars.filter(v => v !== 'NEXTAUTH_SECRET' || !envVars['NEXTAUTH_SECRET']),
    hasSecret: !!envVars['NEXTAUTH_SECRET'] || !!process.env['NEXTAUTH_SECRET']
  };
}

// Check all environment files
const results = [
  checkEnvFile('.env'),
  checkEnvFile('.env.local'),
  checkEnvFile('.env.production')
];

// Display results
console.log('\nEnvironment Check Results:');
console.log('=========================');

let hasErrors = false;

results.forEach(result => {
  console.log(`\n${result.filename}:`);
  
  if (result.missingVars.length > 0) {
    console.log(`❌ Missing required variables: ${result.missingVars.join(', ')}`);
    hasErrors = true;
  } else {
    console.log('✅ All required variables present');
  }
  
  if (result.hasSecret) {
    console.log('✅ NEXTAUTH_SECRET is set');
  } else {
    console.log('❌ NEXTAUTH_SECRET is missing');
    hasErrors = true;
  }
});

// Provide guidance
console.log('\nNextAuth Configuration:');
console.log('======================');
if (hasErrors) {
  console.log('⚠️ Some required environment variables are missing.');
  console.log('Please set them in your .env.production file or in your hosting environment.');
} else {
  console.log('✅ Environment configuration looks good!');
}

// Guide for production deployment
console.log('\nFor production deployment on Vercel:');
console.log('1. Set these environment variables in your Vercel project settings');
console.log('2. Ensure NEXTAUTH_URL is set to your production URL (https://ai.satym.me)');
console.log('3. Use the same NEXTAUTH_SECRET across all environments to maintain sessions');

// Output values to be set (without showing actual values)
console.log('\nRequired environment variables for production:');
requiredVars.forEach(varName => {
  console.log(`- ${varName}`);
}); 