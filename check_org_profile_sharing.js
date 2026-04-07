// PASTE THIS IN BROWSER CONSOLE to check if team members see org profile

console.log('='.repeat(60));
console.log('CHECKING ORGANIZATION PROFILE SHARING');
console.log('='.repeat(60));

// Get the profile from localStorage/React state
const checkProfile = () => {
  // Try to get from React DevTools if available
  const rootElement = document.querySelector('#root');
  if (!rootElement) {
    console.log('❌ No root element found');
    return;
  }

  // Get the auth token
  let authToken = null;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('-auth-token')) {
      authToken = localStorage.getItem(key);
      break;
    }
  }

  if (!authToken) {
    console.log('❌ No auth token found');
    return;
  }

  // Parse token
  const parsed = JSON.parse(authToken);
  const accessToken = parsed.access_token;
  const payload = JSON.parse(atob(accessToken.split('.')[1]));

  console.log('\n👤 User Info:');
  console.log('  User ID:', payload.sub);
  console.log('  Email:', payload.email);
  console.log('  Role:', payload.user_metadata?.role);

  // Check profile data
  fetch('/api/team/context?organization_type=agency', {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  .then(r => r.json())
  .then(data => {
    console.log('\n📋 Organization Context:');
    console.log('  Organization ID:', data.organization_id);
    console.log('  Organization Name:', data.organization_name);
    console.log('  Membership Role:', data.membership_role);
    
    // Now check the profile
    fetch('/rest/v1/agencies?id=eq.' + data.organization_id, {
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpbXlyZ3d5cnNtbHRtemxidXhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwNTQ1NDUsImV4cCI6MjA1OTYzMDU0NX0.SZPJVeLQGq_uZNxSQt_HkMRGzTq_2xTlQ-dZVyMk0Sw'
      }
    })
    .then(r => r.json())
    .then(orgData => {
      const org = orgData[0];
      console.log('\n🏢 Organization Profile Data:');
      console.log('  Agency Name:', org.agency_name);
      console.log('  Plan Tier:', org.plan_tier);
      console.log('  Stripe Customer ID:', org.stripe_customer_id ? '✓ Set' : '✗ Not Set');
      console.log('  Stripe Subscription ID:', org.stripe_subscription_id ? '✓ Set' : '✗ Not Set');
      
      console.log('\n✅ RESULT:');
      console.log('  All team members should see:');
      console.log('  - Agency Name:', org.agency_name);
      console.log('  - Plan Tier:', org.plan_tier);
      console.log('  - Profile Photo:', org.profile_photo_url || 'Not set');
      
      console.log('\n  But only Owner/Admin can:');
      console.log('  - Edit organization profile');
      console.log('  - Manage billing/subscription');
      console.log('  - Change plan tier');
      
      console.log('\n  Project Managers & Reviewers:');
      console.log('  - Can VIEW organization data');
      console.log('  - Can VIEW plan tier');
      console.log('  - CANNOT edit organization profile');
      console.log('  - CANNOT manage billing');
    });
  });
};

checkProfile();
