/**
 * Database setup script
 * Creates 3 test users: CEO (All divisions), CFO (Bebidas), COO (Gear)
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupDatabase() {
  try {
    console.log('Starting database setup...');

    // Test users to create
    const testUsers = [
      {
        phoneNumber: '+58XXXXXXXXX1',
        role: 'CEO',
        divisionAssigned: 'All',
      },
      {
        phoneNumber: '+58XXXXXXXXX2',
        role: 'CFO',
        divisionAssigned: 'Bebidas',
      },
      {
        phoneNumber: '+58XXXXXXXXX3',
        role: 'COO',
        divisionAssigned: 'Gear',
      },
    ];

    // Create or update users
    for (const user of testUsers) {
      const existingUser = await prisma.user.findUnique({
        where: { phoneNumber: user.phoneNumber },
      });

      if (existingUser) {
        console.log(`User ${user.phoneNumber} already exists, skipping...`);
      } else {
        const createdUser = await prisma.user.create({
          data: {
            phoneNumber: user.phoneNumber,
            role: user.role,
            divisionAssigned: user.divisionAssigned,
            active: true,
          },
        });
        console.log(`Created user: ${createdUser.phoneNumber} (${createdUser.role})`);
      }
    }

    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error during database setup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run setup
setupDatabase();
