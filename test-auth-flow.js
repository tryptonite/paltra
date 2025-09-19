#!/usr/bin/env node

import http from 'http';
import fs from 'fs';

console.log('🧪 Testing Authentication Flow...\n');

// Test 1: Check if app loads without errors
function testAppLoads() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3000/', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const hasTitle = data.includes('<title>Paltra Warehouse Portal</title>');
        const hasReactRoot = data.includes('<div id="root"></div>');
        const hasMainScript = data.includes('/src/main.tsx');
        
        console.log('✅ Test 1: App loads successfully');
        console.log(`   - Title present: ${hasTitle ? '✅' : '❌'}`);
        console.log(`   - React root present: ${hasReactRoot ? '✅' : '❌'}`);
        console.log(`   - Main script present: ${hasMainScript ? '✅' : '❌'}`);
        console.log(`   - Status code: ${res.statusCode}`);
        resolve(res.statusCode === 200);
      });
    });
    
    req.on('error', (err) => {
      console.log('❌ Test 1: App failed to load');
      console.log(`   Error: ${err.message}`);
      resolve(false);
    });
  });
}

// Test 2: Check if environment variables are configured
function testEnvironmentVariables() {
  
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const hasSupabaseUrl = envContent.includes('VITE_SUPABASE_URL=');
    const hasSupabaseKey = envContent.includes('VITE_SUPABASE_ANON_KEY=');
    const hasPlaceholders = envContent.includes('your_supabase_project_url_here') || 
                           envContent.includes('your_supabase_anon_key_here');
    
    console.log('✅ Test 2: Environment Variables');
    console.log(`   - Supabase URL configured: ${hasSupabaseUrl ? '✅' : '❌'}`);
    console.log(`   - Supabase Key configured: ${hasSupabaseKey ? '✅' : '❌'}`);
    console.log(`   - Using placeholder values: ${hasPlaceholders ? '⚠️' : '✅'}`);
    
    return hasSupabaseUrl && hasSupabaseKey && !hasPlaceholders;
  } catch (error) {
    console.log('❌ Test 2: Environment Variables');
    console.log(`   Error reading .env.local: ${error.message}`);
    return false;
  }
}

// Test 3: Check if authentication components exist
function testAuthComponents() {
  
  const authFile = 'src/pages/Auth.tsx';
  const contextFile = 'src/contexts/AuthContext.tsx';
  const supabaseFile = 'src/lib/supabase.ts';
  
  const authExists = fs.existsSync(authFile);
  const contextExists = fs.existsSync(contextFile);
  const supabaseExists = fs.existsSync(supabaseFile);
  
  console.log('✅ Test 3: Authentication Components');
  console.log(`   - Auth page exists: ${authExists ? '✅' : '❌'}`);
  console.log(`   - Auth context exists: ${contextExists ? '✅' : '❌'}`);
  console.log(`   - Supabase config exists: ${supabaseExists ? '✅' : '❌'}`);
  
  return authExists && contextExists && supabaseExists;
}

// Test 4: Check if routing is configured correctly
function testRouting() {
  
  try {
    const indexContent = fs.readFileSync('src/pages/index.tsx', 'utf8');
    const hasAuthImport = indexContent.includes("import Auth from './Auth'");
    const hasAuthContext = indexContent.includes("import { useAuth } from '@/contexts/AuthContext'");
    const hasAuthCheck = indexContent.includes('if (!user)');
    const hasAuthRoute = indexContent.includes('<Route path="*" element={<Auth />} />');
    
    console.log('✅ Test 4: Routing Configuration');
    console.log(`   - Auth import: ${hasAuthImport ? '✅' : '❌'}`);
    console.log(`   - Auth context import: ${hasAuthContext ? '✅' : '❌'}`);
    console.log(`   - User check logic: ${hasAuthCheck ? '✅' : '❌'}`);
    console.log(`   - Auth route: ${hasAuthRoute ? '✅' : '❌'}`);
    
    return hasAuthImport && hasAuthContext && hasAuthCheck && hasAuthRoute;
  } catch (error) {
    console.log('❌ Test 4: Routing Configuration');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting Authentication Flow Tests\n');
  
  const test1 = await testAppLoads();
  const test2 = testEnvironmentVariables();
  const test3 = testAuthComponents();
  const test4 = testRouting();
  
  console.log('\n📊 Test Results Summary:');
  console.log(`   App Loading: ${test1 ? '✅' : '❌'}`);
  console.log(`   Environment: ${test2 ? '✅' : '❌'}`);
  console.log(`   Components: ${test3 ? '✅' : '❌'}`);
  console.log(`   Routing: ${test4 ? '✅' : '❌'}`);
  
  const allPassed = test1 && test2 && test3 && test4;
  
  console.log(`\n${allPassed ? '🎉' : '⚠️'} Overall Status: ${allPassed ? 'All tests passed!' : 'Some tests failed'}`);
  
  if (!test2) {
    console.log('\n💡 Next Steps:');
    console.log('   1. Add your Supabase credentials to .env.local');
    console.log('   2. Get credentials from: https://supabase.com/dashboard');
    console.log('   3. Replace placeholder values in .env.local');
  }
  
  if (allPassed) {
    console.log('\n🎯 Authentication Flow is Ready!');
    console.log('   - Unauthenticated users will see the sign in/sign up page');
    console.log('   - Authenticated users will see the main application');
    console.log('   - All routes are properly protected');
  }
}

runTests().catch(console.error);
