import argon2 from 'argon2';
import { PrismaClient, InquirySource, InquiryStatus, SubscriberStatus, UserRole } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@mmkaccountants.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const adminName = process.env.SEED_ADMIN_NAME ?? 'MMK Admin';

  const adminPasswordHash = await argon2.hash(adminPassword);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: {
      fullName: adminName,
      role: UserRole.ADMIN,
      isActive: true,
      passwordHash: adminPasswordHash
    },
    create: {
      email: adminEmail.toLowerCase(),
      fullName: adminName,
      role: UserRole.ADMIN,
      isActive: true,
      passwordHash: adminPasswordHash
    }
  });

  const staff = await prisma.user.upsert({
    where: { email: 'staff@mmkaccountants.local' },
    update: {
      fullName: 'MMK Staff',
      role: UserRole.STAFF,
      isActive: true,
      passwordHash: await argon2.hash('ChangeMe123!')
    },
    create: {
      email: 'staff@mmkaccountants.local',
      fullName: 'MMK Staff',
      role: UserRole.STAFF,
      isActive: true,
      passwordHash: await argon2.hash('ChangeMe123!')
    }
  });

  const inquiryCount = await prisma.inquiry.count();
  if (inquiryCount === 0) {
    const inquiry1 = await prisma.inquiry.create({
      data: {
        source: InquirySource.CONTACT,
        fullName: 'Alex Carter',
        email: 'alex.carter@example.com',
        phone: '+44 7700 900111',
        service: 'Accounting & Compliance',
        message: 'Need year-end accounts and corporation tax filing support for my limited company.',
        status: InquiryStatus.NEW,
        assignedToId: staff.id
      }
    });

    await prisma.inquiryNote.create({
      data: {
        inquiryId: inquiry1.id,
        authorId: staff.id,
        note: 'Initial call scheduled for tomorrow morning.'
      }
    });

    await prisma.inquiry.create({
      data: {
        source: InquirySource.QUOTE,
        fullName: 'Sophie Khan',
        email: 'sophie.khan@example.com',
        phone: '+44 7700 900222',
        service: 'Payroll',
        message: 'Please provide a quote for monthly payroll for 18 employees.',
        status: InquiryStatus.IN_PROGRESS,
        assignedToId: admin.id
      }
    });
  }

  const subscribers = [
    { email: 'newsletter1@example.com', status: SubscriberStatus.ACTIVE },
    { email: 'newsletter2@example.com', status: SubscriberStatus.ACTIVE },
    { email: 'newsletter3@example.com', status: SubscriberStatus.UNSUBSCRIBED }
  ];

  for (const subscriber of subscribers) {
    await prisma.newsletterSubscriber.upsert({
      where: { email: subscriber.email },
      update: {
        status: subscriber.status,
        unsubscribedAt: subscriber.status === SubscriberStatus.UNSUBSCRIBED ? new Date() : null
      },
      create: {
        email: subscriber.email,
        status: subscriber.status,
        unsubscribedAt: subscriber.status === SubscriberStatus.UNSUBSCRIBED ? new Date() : null,
        unsubscribeToken: crypto.randomBytes(24).toString('hex'),
        sourcePage: 'seed'
      }
    });
  }

  console.log('Seed complete.');
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
  console.log('Staff login: staff@mmkaccountants.local / ChangeMe123!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
