// PASTE THIS IN YOUR BROWSER CONSOLE TO FIX THE ISSUE
// This will clear cached permissions and reload the page

console.log('='.repeat(60));
console.log('CLEARING FRONTEND CACHE');
console.log('='.repeat(60));

// Clear React Query cache (if using TanStack Query)
if (window.queryClient) {
  console.log('✅ Clearing React Query cache...');
  window.queryClient.clear();
}

// Clear all localStorage except auth token
console.log('\n📦 Clearing cached data (keeping auth token)...');
const authTokenKey = 'sb-himyrgwyrsmltmzlbuxm-auth-token';
const authToken = localStorage.getItem(authTokenKey);

// Clear all localStorage
localStorage.clear();

// Restore auth token
if (authToken) {
  localStorage.setItem(authTokenKey, authToken);
  console.log('✅ Auth token preserved');
}

// Clear sessionStorage
sessionStorage.clear();
console.log('✅ Session cleared');

console.log('\n✅ Cache cleared successfully!');
console.log('\n🔄 Reloading page in 2 seconds...');

setTimeout(() => {
  window.location.reload();
}, 2000);

console.log('\n' + '='.repeat(60));
