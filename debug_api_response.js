// Quick test script to check what the API returns
// Run this in browser console when logged in

fetch('/api/free-scans', {
  method: 'GET',
  credentials: 'include'
})
  .then(res => res.json())
  .then(data => {
    console.log('API Response:', data);
    console.log('Remaining scans:', data.remaining);
    console.log('Type:', data.type);
    console.log('Expected for registered user: remaining = 3, type = "registered"');
  })
  .catch(err => {
    console.error('API Error:', err);
  });

