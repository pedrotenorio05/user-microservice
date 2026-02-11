const jwt = require('jsonwebtoken');
const fs = require('fs');

// 1. Carrega sua chave privada do arquivo que você criou
const privateKey = fs.readFileSync('private.key');

// 2. Define o Payload (Aqui você coloca o ID real do seu banco)
const payload = {
  sub: "484f70a6-388f-40ef-a6ef-8b53fb1ea607-a2cc-43e1-8503-9fe862c1e133", // Pegue no npx prisma studio
  scope: ["GESTOR"],
  email: "mariana@arco.com"
};

// 3. Assina o token
try {
  const token = jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn: '2h' });
  console.log('\n✅ TOKEN GERADO COM SUCESSO:\n');
  console.log(token);
  console.log('\n--- Use este token no seu comando CURL ou Postman ---');
} catch (err) {
  console.error('Erro ao gerar token:', err.message);
}