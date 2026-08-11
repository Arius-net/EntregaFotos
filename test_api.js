fetch('https://entregafotos-production.up.railway.app/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@test.com', password: '123', role: 'photographer' })
}).then(async res => {
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Response:', text);
}).catch(err => console.error(err));
