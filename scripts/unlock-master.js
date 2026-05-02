const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Master Admin Unlock Script ---');
    
    const masterAccount = await prisma.user.findUnique({
        where: { username: 'master' }
    });

    if (!masterAccount) {
        console.error('Error: Master admin account (username: "master") not found.');
        process.exit(1);
    }

    await prisma.user.update({
        where: { id: masterAccount.id },
        data: {
            lockedUntil: null,
            failedLoginAttempts: 0,
            isActive: true,
            deletedAt: null
        }
    });

    console.log('Success: Master admin account has been unlocked and reset.');
}

main()
    .catch(e => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
