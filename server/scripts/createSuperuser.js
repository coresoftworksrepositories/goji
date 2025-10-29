#!/usr/bin/env node

/**
 * Create Superuser Script
 * 
 * This script creates a superuser account that bypasses the approval system.
 * Superusers can:
 * - Access the system regardless of approval settings
 * - Manage approved users
 * - Have full administrative privileges
 * 
 * Usage:
 * node scripts/createSuperuser.js
 * or
 * npm run create-superuser
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

function askPassword(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    
    let password = '';
    
    stdin.on('data', (char) => {
      char = char + '';
      
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.setRawMode(false);
          stdin.pause();
          stdout.write('\n');
          resolve(password);
          break;
        case '\u0003':
          console.log('\nOperation cancelled.');
          process.exit(1);
          break;
        case '\u007f': // Backspace
        case '\b':
          if (password.length > 0) {
            password = password.slice(0, -1);
            stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          stdout.write('*');
          break;
      }
    });
  });
}

async function createSuperuser() {
  try {
    console.log('🔧 Goji Superuser Creation Tool');
    console.log('================================\n');
    
    console.log('This will create a superuser account that bypasses all approval requirements.');
    console.log('Superusers have full administrative privileges.\n');
    
    // Get user input
    const email = await askQuestion('Email address: ');
    const username = await askQuestion('Username: ');
    const firstName = await askQuestion('First name (optional): ');
    const lastName = await askQuestion('Last name (optional): ');
    const password = await askPassword('Password: ');
    const confirmPassword = await askPassword('Confirm password: ');
    
    // Validate input
    if (!email || !username || !password) {
      console.error('❌ Email, username, and password are required.');
      process.exit(1);
    }
    
    if (password !== confirmPassword) {
      console.error('❌ Passwords do not match.');
      process.exit(1);
    }
    
    if (password.length < 6) {
      console.error('❌ Password must be at least 6 characters long.');
      process.exit(1);
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ]
      }
    });
    
    if (existingUser) {
      console.error('❌ User with this email or username already exists.');
      process.exit(1);
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create superuser
    const superuser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        role: 'SUPERUSER',
        isApproved: true,
        approvedAt: new Date()
      }
    });
    
    console.log('\n✅ Superuser created successfully!');
    console.log(`📧 Email: ${superuser.email}`);
    console.log(`👤 Username: ${superuser.username}`);
    console.log(`🔑 Role: ${superuser.role}`);
    console.log(`✅ Approved: ${superuser.isApproved}`);
    console.log(`🆔 ID: ${superuser.id}\n`);
    
    console.log('The superuser can now log in and manage the system, including:');
    console.log('- Approving new user registrations');
    console.log('- Managing approved email addresses');
    console.log('- Full administrative access to all features\n');
    
  } catch (error) {
    console.error('❌ Error creating superuser:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

// Handle process interruption
process.on('SIGINT', async () => {
  console.log('\n👋 Goodbye!');
  await prisma.$disconnect();
  rl.close();
  process.exit(0);
});

// Run the script
if (require.main === module) {
  createSuperuser();
}

module.exports = { createSuperuser };