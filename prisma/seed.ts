import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt'; // Importamos o bcrypt

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando o seed (modo Dev)...');

  // 1. Gerar o hash da senha "123456"
  const passwordHash = await bcrypt.hash('123456', 10);

  // 2. Criar ou Atualizar o Admin (Upsert)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@arco.com' }, // Procura por este email
    update: { // Se existir, ATUALIZA a senha e o status
      password: passwordHash,
      status: UserStatus.ACTIVE,
    },
    create: { // Se não existir, CRIA do zero
      name: 'Pedro Admin',
      email: 'admin@arco.com',
      cpf: '000.111.222-33',
      phone: '(81) 99999-0000',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      password: passwordHash, // Senha salva com hash!
      activationToken: 'seed-token',
      tokenExpiresAt: new Date(),
    },
  });

  console.log(`✅ Admin garantido: ${admin.email}`);
  console.log(`🔑 Senha definida para: 123456`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });