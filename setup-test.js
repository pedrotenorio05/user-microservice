const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fs = require('fs');

// 1. Gera par de chaves RSA (Simulando o Java)
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// 2. Formata a chave pública para o .env (linha única)
const envPublicKey = publicKey.replace(/(\r\n|\n|\r)/gm, "");

console.log('\n✅ 1. COPIE E COLE ISSO NO SEU .ENV:');
console.log(`JWT_PUBLIC_KEY="${envPublicKey}"`);

// 3. Gera um Token de Admin válido (Simulando login)
// O ID abaixo precisa existir no banco (vamos criar no seed)
// Usando um UUID fixo para garantir que bata com o seed se for necessário, 
// ou pegamos o primeiro usuário do banco depois.
const payload = {
  sub: 'admin-id-placeholder', // Vamos ajustar isso jajá
  scope: ['ROLE_ADMIN'],
  email: 'admin@arco.com'
};

const token = jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn: '1h' });

console.log('\n🔑 2. SEU TOKEN JWT PARA TESTES (Bearer Token):');
console.log(token);
console.log('\n(Salve esse token para usar no Postman/Insomnia)');