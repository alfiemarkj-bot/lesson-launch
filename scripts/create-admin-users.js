require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const ADMIN_EMAILS = [
  'alfiemarkj@gmail.com',
  'd.o.lamb2002@gmail.com'
];

async function createAdminUsers() {
  console.log('🔧 Setting up admin users...\n');

  for (const email of ADMIN_EMAILS) {
    try {
      // Check if user exists in auth
      const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
      
      let userId = null;
      
      if (authUsers && authUsers.users) {
        const existingUser = authUsers.users.find(u => u.email === email);
        if (existingUser) {
          userId = existingUser.id;
          console.log(`✓ Found existing auth user: ${email}`);
        }
      }
      
      // Check if user record exists in users table
      const { data: existingRecord, error: checkError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (existingRecord) {
        // User exists, update to admin
        console.log(`  Updating ${email} to admin...`);
        const { error: updateError } = await supabase
          .from('users')
          .update({
            role: 'admin',
            subscription_tier: 'unlimited'
          })
          .eq('email', email);
        
        if (updateError) {
          console.log(`  ❌ Error updating: ${updateError.message}`);
        } else {
          console.log(`  ✅ ${email} is now admin with unlimited lessons\n`);
        }
      } else if (userId) {
        // Auth user exists but no user record, create one
        console.log(`  Creating user record for ${email}...`);
        const { error: insertError } = await supabase
          .from('users')
          .insert([{
            id: userId,
            email: email,
            role: 'admin',
            subscription_tier: 'unlimited',
            name: email.split('@')[0]
          }]);
        
        if (insertError) {
          console.log(`  ❌ Error creating: ${insertError.message}`);
        } else {
          console.log(`  ✅ ${email} created as admin with unlimited lessons\n`);
        }
      } else {
        console.log(`  ⚠️ ${email} not found in auth. They need to sign up first.\n`);
      }
      
    } catch (error) {
      console.log(`❌ Error processing ${email}:`, error.message, '\n');
    }
  }
  
  // List all users
  console.log('\n📋 Current users in database:');
  const { data: allUsers } = await supabase
    .from('users')
    .select('email, role, subscription_tier')
    .order('created_at', { ascending: false });
  
  if (allUsers && allUsers.length > 0) {
    allUsers.forEach(user => {
      const badge = user.role === 'admin' ? '👑' : '👤';
      console.log(`  ${badge} ${user.email} (${user.role || 'user'}, ${user.subscription_tier || 'free'})`);
    });
  } else {
    console.log('  No users found. Users need to sign up first.');
  }
}

createAdminUsers()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });

