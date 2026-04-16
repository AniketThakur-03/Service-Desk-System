require('dotenv').config();
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { computeSlaDueAt } = require('../src/utils/sla');

const prisma = new PrismaClient();

async function upsertUser(email, role) {
  const passwordHash = await bcrypt.hash('DemoPass!123', 12);
  return prisma.user.upsert({
    where: { email },
    update: { role, passwordHash },
    create: { email, role, passwordHash },
  });
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function seedAssets(employee) {
  if (await prisma.asset.count()) return;
  await prisma.asset.createMany({
    data: [
      {
        name: 'Dell Latitude 5420',
        assetTag: 'LAP-1001',
        type: 'Laptop',
        serialNumber: 'DL5420-8831',
        location: 'Campus Library',
        status: 'ASSIGNED',
        assignedUserId: employee.id,
      },
      {
        name: 'HP LaserJet Pro',
        assetTag: 'PRN-2008',
        type: 'Printer',
        serialNumber: 'HP-PR-2008',
        location: 'Room 3B',
        status: 'IN_REPAIR',
      },
      {
        name: 'Logitech Conference Camera',
        assetTag: 'AV-3002',
        type: 'Conference Equipment',
        serialNumber: 'LG-AV-3002',
        location: 'Board Room',
        status: 'IN_STOCK',
      },
    ],
  });
}

async function seedArticles(admin) {
  if (await prisma.knowledgeArticle.count()) return;
  const articles = [
    {
      title: 'How to reconnect to campus Wi-Fi',
      category: 'Network',
      summary: 'Simple steps for removing an old Wi-Fi profile and joining again.',
      content: '1. Forget the saved network on your device.\n2. Restart Wi-Fi.\n3. Rejoin using your campus credentials.\n4. If the sign-in page does not load, open a browser and visit any website to trigger the captive portal.',
    },
    {
      title: 'Printer queue not showing up',
      category: 'Printing',
      summary: 'Checklist for reconnecting a shared printer or refreshing print permissions.',
      content: 'Open your printer settings, remove the old printer entry, and add the shared printer again. If the queue still does not appear, ask IT to verify your department printer permissions.',
    },
    {
      title: 'Laptop handoff checklist',
      category: 'Hardware',
      summary: 'What the service desk records before assigning a device to a staff member.',
      content: 'Record the asset tag, serial number, assigned user, device condition, charger availability, and any open support ticket linked to the device.',
    },
  ];

  for (const article of articles) {
    await prisma.knowledgeArticle.create({
      data: {
        ...article,
        slug: slugify(article.title),
        authorId: admin.id,
      },
    });
  }
}

async function seedTickets(admin, agent, employee) {
  if (await prisma.ticket.count()) return;

  const laptop = await prisma.asset.findUnique({ where: { assetTag: 'LAP-1001' } });
  const printer = await prisma.asset.findUnique({ where: { assetTag: 'PRN-2008' } });

  const tickets = await Promise.all([
    prisma.ticket.create({
      data: {
        title: 'Laptop cannot connect to campus Wi-Fi',
        description: 'The laptop sees the network but keeps disconnecting during sign-in. Issue started this morning in the library.',
        category: 'Network',
        priority: 'HIGH',
        status: 'OPEN',
        requesterId: employee.id,
        assigneeId: agent.id,
        assetId: laptop?.id,
        slaDueAt: computeSlaDueAt('HIGH'),
      },
    }),
    prisma.ticket.create({
      data: {
        title: 'Projector remote missing in lab room 3B',
        description: 'The projector still works, but the remote is missing and staff had to adjust settings manually during class.',
        category: 'Classroom Support',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        requesterId: employee.id,
        assigneeId: agent.id,
        slaDueAt: computeSlaDueAt('MEDIUM'),
      },
    }),
    prisma.ticket.create({
      data: {
        title: 'Need access to shared printer queue',
        description: 'Printing request is blocked because the department printer is not showing under the employee account.',
        category: 'Printing',
        priority: 'LOW',
        status: 'WAITING',
        requesterId: employee.id,
        assigneeId: admin.id,
        assetId: printer?.id,
        slaDueAt: computeSlaDueAt('LOW'),
      },
    }),
  ]);

  for (const ticket of tickets) {
    await prisma.ticketHistory.create({
      data: {
        ticketId: ticket.id,
        action: 'CREATED',
        field: 'ticket',
        newValue: `Created with ${ticket.priority} priority`,
        actorId: employee.id,
        actorEmail: employee.email,
      },
    });

    if (ticket.assigneeId) {
      await prisma.notification.create({
        data: {
          userId: ticket.assigneeId,
          title: 'New ticket assigned',
          body: `${ticket.title} has been assigned to you.`,
          link: `/tickets/${ticket.id}`,
          type: 'ASSIGNMENT',
        },
      });
    }
  }
}

async function main() {
  const [admin, agent, employee] = await Promise.all([
    upsertUser('admin@campusdesk.dev', 'ADMIN'),
    upsertUser('agent@campusdesk.dev', 'AGENT'),
    upsertUser('employee@campusdesk.dev', 'EMPLOYEE'),
  ]);

  await seedAssets(employee);
  await seedArticles(admin);
  await seedTickets(admin, agent, employee);

  console.log('Seed complete. Demo password for all seeded users: DemoPass!123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
