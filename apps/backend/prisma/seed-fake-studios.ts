import {
  PrismaClient,
  StudioStatus,
  SubscriptionStatus,
  SubscriptionType,
  TrainingSessionStatus,
  UserRole,
} from '@prisma/client';

const prisma = new PrismaClient();

const SEED_SLUG_PREFIX = 'seed-demo-';

const DEFAULT_CROP = { x: 0, y: 0, w: 1, h: 1 };

function photoGalleryEntry(id: string, url: string) {
  return {
    id,
    originalUrl: url,
    heroUrl: url,
    cardUrl: url,
    crops: {
      studioPage: DEFAULT_CROP,
      browseCard: DEFAULT_CROP,
    },
  };
}

type SeedTraining = {
  name: string;
  description: string;
  duration: number;
  price: number;
  categoryId: number;
  displayColor: string;
  trainerIndexes: number[];
};

type SeedTrainer = {
  name: string;
  email: string;
  phone?: string;
};

type SeedStudio = {
  key: string;
  name: string;
  descriptionEn: string;
  descriptionRu: string;
  descriptionVi: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string;
  instagram: string;
  logoUrl: string;
  photoUrls: string[];
  ownerEmail: string;
  ownerName: string;
  subscriptionType: SubscriptionType;
  trainers: SeedTrainer[];
  trainings: SeedTraining[];
};

const STUDIOS: SeedStudio[] = [
  {
    key: 'zen-flow-yoga',
    name: 'Zen Flow Yoga',
    descriptionEn:
      'Morning flows, yin evenings, and breathwork for all levels in An Hai.',
    descriptionRu:
      'Утренние практики, вечерний инь и дыхательные техники для любого уровня.',
    descriptionVi:
      'Buổi sáng flow, buổi tối yin và thở cho mọi trình độ tại An Hải.',
    address: '42 Vo Nguyen Giap, An Hai, Da Nang, Vietnam',
    latitude: 16.0682,
    longitude: 108.2431,
    phone: '+84 905 111 001',
    email: 'hello@zenflow-yoga.test',
    instagram: '@zenflow.danang',
    logoUrl:
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=256&h=256&fit=crop',
    photoUrls: [
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&fit=crop',
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&fit=crop',
    ],
    ownerEmail: 'seed-owner-zen@henzo.dev',
    ownerName: 'Zen Flow Owner',
    subscriptionType: SubscriptionType.STUDIO,
    trainers: [
      {
        name: 'Linh Nguyen',
        email: 'linh@zenflow-yoga.test',
        phone: '+84 905 111 002',
      },
      { name: 'Mai Tran', email: 'mai@zenflow-yoga.test' },
    ],
    trainings: [
      {
        name: 'Sunrise Vinyasa',
        description: 'Energizing 60-minute flow before work.',
        duration: 60,
        price: 180000,
        categoryId: 1,
        displayColor: '#FDE047',
        trainerIndexes: [0, 1],
      },
      {
        name: 'Yin & Restore',
        description: 'Slow stretches and guided relaxation.',
        duration: 75,
        price: 220000,
        categoryId: 1,
        displayColor: '#FDE047',
        trainerIndexes: [1],
      },
      {
        name: 'Breath & Meditation',
        description: 'Pranayama basics and seated meditation.',
        duration: 45,
        price: 150000,
        categoryId: 5,
        displayColor: '#7C3AED',
        trainerIndexes: [0],
      },
    ],
  },
  {
    key: 'iron-district-gym',
    name: 'Iron District Gym',
    descriptionEn:
      'Strength floor, barbell racks, and coached lifting sessions near Han River.',
    descriptionRu:
      'Зал силовых, стойки для штанги и тренировки с тренером у реки Хан.',
    descriptionVi:
      'Khu strength, giá đòn tạ và buổi tập có huấn luyện viên gần sông Hàn.',
    address: '18 Bach Dang, Hai Chau, Da Nang, Vietnam',
    latitude: 16.0755,
    longitude: 108.2234,
    phone: '+84 905 222 001',
    email: 'info@irondistrict.test',
    instagram: '@iron.district.dn',
    logoUrl:
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=256&h=256&fit=crop',
    photoUrls: [
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&fit=crop',
      'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=1200&fit=crop',
    ],
    ownerEmail: 'seed-owner-iron@henzo.dev',
    ownerName: 'Iron District Owner',
    subscriptionType: SubscriptionType.ENTERPRISE,
    trainers: [
      {
        name: 'Alex Korolev',
        email: 'alex@irondistrict.test',
        phone: '+84 905 222 002',
      },
      { name: 'Dmitry Volkov', email: 'dmitry@irondistrict.test' },
    ],
    trainings: [
      {
        name: 'Barbell Basics',
        description: 'Squat, bench, deadlift technique for beginners.',
        duration: 60,
        price: 250000,
        categoryId: 4,
        displayColor: '#1E293B',
        trainerIndexes: [0],
      },
      {
        name: 'Hypertrophy Push/Pull',
        description: 'Upper body split with tempo work.',
        duration: 75,
        price: 280000,
        categoryId: 4,
        displayColor: '#1E293B',
        trainerIndexes: [0, 1],
      },
      {
        name: 'Mobility Recovery',
        description: 'Foam rolling, bands, and cooldown protocols.',
        duration: 45,
        price: 160000,
        categoryId: 6,
        displayColor: '#14B8A6',
        trainerIndexes: [1],
      },
    ],
  },
  {
    key: 'rhythm-dance-studio',
    name: 'Rhythm Dance Studio',
    descriptionEn:
      'Hip-hop, contemporary, and open choreography sessions downtown.',
    descriptionRu:
      'Хип-хоп, contemporary и открытые хорео-классы в центре города.',
    descriptionVi: 'Hip-hop, contemporary và lớp biên đạo mở ngay trung tâm.',
    address: '7 Hung Vuong, Hai Chau, Da Nang, Vietnam',
    latitude: 16.0711,
    longitude: 108.2218,
    phone: '+84 905 333 001',
    email: 'book@rhythmdance.test',
    instagram: '@rhythm.dance.dn',
    logoUrl:
      'https://images.unsplash.com/photo-1508700115892-45ecd5ae9898?w=256&h=256&fit=crop',
    photoUrls: [
      'https://images.unsplash.com/photo-1508700115892-45ecd5ae9898?w=1200&fit=crop',
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&fit=crop',
    ],
    ownerEmail: 'seed-owner-rhythm@henzo.dev',
    ownerName: 'Rhythm Dance Owner',
    subscriptionType: SubscriptionType.STUDIO,
    trainers: [
      { name: 'Sophie Lee', email: 'sophie@rhythmdance.test' },
      {
        name: 'Kevin Pham',
        email: 'kevin@rhythmdance.test',
        phone: '+84 905 333 002',
      },
    ],
    trainings: [
      {
        name: 'Hip-Hop Foundations',
        description: 'Grooves, musicality, and beginner-friendly combos.',
        duration: 60,
        price: 200000,
        categoryId: 7,
        displayColor: '#E879F9',
        trainerIndexes: [0],
      },
      {
        name: 'Contemporary Flow',
        description: 'Floor work and release-based movement.',
        duration: 75,
        price: 230000,
        categoryId: 7,
        displayColor: '#E879F9',
        trainerIndexes: [0, 1],
      },
      {
        name: 'Flex & Stretch',
        description: 'Dancer-focused flexibility drills.',
        duration: 50,
        price: 170000,
        categoryId: 3,
        displayColor: '#F472B6',
        trainerIndexes: [1],
      },
    ],
  },
  {
    key: 'pulse-hiit-lab',
    name: 'Pulse HIIT Lab',
    descriptionEn:
      'Short intense intervals, cardio circuits, and Saturday bootcamps.',
    descriptionRu:
      'Короткие интенсивные интервалы, кардио-круги и субботние bootcamp.',
    descriptionVi:
      'Interval ngắn cường độ cao, vòng cardio và bootcamp thứ Bảy.',
    address: '55 Nguyen Van Linh, Thanh Khe, Da Nang, Vietnam',
    latitude: 16.0598,
    longitude: 108.1987,
    phone: '+84 905 444 001',
    email: 'team@pulsehiit.test',
    instagram: '@pulse.hiit.lab',
    logoUrl:
      'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=256&h=256&fit=crop',
    photoUrls: [
      'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&fit=crop',
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&fit=crop',
    ],
    ownerEmail: 'seed-owner-pulse@henzo.dev',
    ownerName: 'Pulse HIIT Owner',
    subscriptionType: SubscriptionType.SOLO,
    trainers: [
      {
        name: 'Tom Baker',
        email: 'tom@pulsehiit.test',
        phone: '+84 905 444 002',
      },
    ],
    trainings: [
      {
        name: 'HIIT Express',
        description: '30/30 work-rest stations, full body.',
        duration: 45,
        price: 190000,
        categoryId: 4,
        displayColor: '#1E293B',
        trainerIndexes: [0],
      },
      {
        name: 'Cardio Engine',
        description: 'Row, bike, and sled intervals.',
        duration: 50,
        price: 210000,
        categoryId: 4,
        displayColor: '#1E293B',
        trainerIndexes: [0],
      },
      {
        name: 'Saturday Bootcamp',
        description: 'Outdoor-style team workout.',
        duration: 60,
        price: 240000,
        categoryId: 9,
        displayColor: '#F97316',
        trainerIndexes: [0],
      },
    ],
  },
  {
    key: 'serenity-pilates',
    name: 'Serenity Pilates',
    descriptionEn:
      'Reformer-inspired mat work, core stability, and posture clinics.',
    descriptionRu: 'Мат-пилатес, стабилизация корпуса и занятия для осанки.',
    descriptionVi: 'Pilates thảm, ổn định core và lớp tư thế.',
    address: '12 Le Duan, Hai Chau, Da Nang, Vietnam',
    latitude: 16.0779,
    longitude: 108.2205,
    phone: '+84 905 555 001',
    email: 'studio@serenity-pilates.test',
    instagram: '@serenity.pilates',
    logoUrl:
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=256&h=256&fit=crop',
    photoUrls: [
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200&fit=crop',
      'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=1200&fit=crop',
    ],
    ownerEmail: 'seed-owner-serenity@henzo.dev',
    ownerName: 'Serenity Pilates Owner',
    subscriptionType: SubscriptionType.STUDIO,
    trainers: [
      { name: 'Anna Petrova', email: 'anna@serenity-pilates.test' },
      {
        name: 'Hana Suzuki',
        email: 'hana@serenity-pilates.test',
        phone: '+84 905 555 002',
      },
    ],
    trainings: [
      {
        name: 'Mat Pilates Core',
        description: 'Classical mat sequence with props.',
        duration: 55,
        price: 210000,
        categoryId: 2,
        displayColor: '#FB7185',
        trainerIndexes: [0, 1],
      },
      {
        name: 'Posture Reset',
        description: 'Shoulder and spine alignment focus.',
        duration: 50,
        price: 195000,
        categoryId: 3,
        displayColor: '#F472B6',
        trainerIndexes: [1],
      },
      {
        name: 'Mindful Stretch',
        description: 'Slow mobility with guided breathing.',
        duration: 45,
        price: 165000,
        categoryId: 5,
        displayColor: '#7C3AED',
        trainerIndexes: [0],
      },
    ],
  },
  {
    key: 'saigon-flow-yoga',
    name: 'Saigon Flow Yoga',
    descriptionEn:
      'Rooftop vinyasa and evening yin in District 1, steps from Nguyen Hue.',
    descriptionRu:
      'Виньяса на крыше и вечерний инь в районе 1, рядом с Nguyen Hue.',
    descriptionVi:
      'Vinyasa trên sân thượng và yin buổi tối tại Quận 1, gần Nguyễn Huệ.',
    address: '22 Nguyen Hue, District 1, Ho Chi Minh City, Vietnam',
    latitude: 10.7738,
    longitude: 106.7045,
    phone: '+84 906 111 001',
    email: 'hello@saigonflow-yoga.test',
    instagram: '@saigonflow.yoga',
    logoUrl:
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=256&h=256&fit=crop',
    photoUrls: [
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&fit=crop',
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&fit=crop',
    ],
    ownerEmail: 'seed-owner-saigonflow@henzo.dev',
    ownerName: 'Saigon Flow Owner',
    subscriptionType: SubscriptionType.STUDIO,
    trainers: [
      {
        name: 'Thao Le',
        email: 'thao@saigonflow-yoga.test',
        phone: '+84 906 111 002',
      },
      { name: 'Minh Vo', email: 'minh@saigonflow-yoga.test' },
    ],
    trainings: [
      {
        name: 'District 1 Sunrise Flow',
        description: '60-minute vinyasa before the city heats up.',
        duration: 60,
        price: 200000,
        categoryId: 1,
        displayColor: '#FDE047',
        trainerIndexes: [0, 1],
      },
      {
        name: 'Rooftop Yin',
        description: 'Slow stretches with skyline views.',
        duration: 75,
        price: 240000,
        categoryId: 1,
        displayColor: '#FDE047',
        trainerIndexes: [1],
      },
      {
        name: 'Breathwork Reset',
        description: 'Pranayama and guided relaxation.',
        duration: 45,
        price: 170000,
        categoryId: 5,
        displayColor: '#7C3AED',
        trainerIndexes: [0],
      },
    ],
  },
  {
    key: 'thao-dien-strength',
    name: 'Thao Dien Strength Club',
    descriptionEn:
      'Barbell coaching, HIIT circuits, and mobility in Thao Dien.',
    descriptionRu: 'Штанга, HIIT-круги и мобилити в районе Thao Dien.',
    descriptionVi: 'Coaching tạ, vòng HIIT và mobility tại Thảo Điền.',
    address: '44 Nguyen Van Huong, Thao Dien, Ho Chi Minh City, Vietnam',
    latitude: 10.8025,
    longitude: 106.7398,
    phone: '+84 906 222 001',
    email: 'team@thaodien-strength.test',
    instagram: '@thaodien.strength',
    logoUrl:
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=256&h=256&fit=crop',
    photoUrls: [
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&fit=crop',
      'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&fit=crop',
    ],
    ownerEmail: 'seed-owner-thaodien@henzo.dev',
    ownerName: 'Thao Dien Strength Owner',
    subscriptionType: SubscriptionType.ENTERPRISE,
    trainers: [
      {
        name: 'Chris Miller',
        email: 'chris@thaodien-strength.test',
        phone: '+84 906 222 002',
      },
      { name: 'Lan Pham', email: 'lan@thaodien-strength.test' },
    ],
    trainings: [
      {
        name: 'Strength Foundations',
        description: 'Squat, hinge, and press progressions.',
        duration: 60,
        price: 280000,
        categoryId: 4,
        displayColor: '#1E293B',
        trainerIndexes: [0],
      },
      {
        name: 'HIIT Engine',
        description: 'Intervals on rower, bike, and sled.',
        duration: 45,
        price: 220000,
        categoryId: 4,
        displayColor: '#1E293B',
        trainerIndexes: [0, 1],
      },
      {
        name: 'Mobility Lab',
        description: 'Bands, foam rolling, and recovery flows.',
        duration: 50,
        price: 190000,
        categoryId: 6,
        displayColor: '#14B8A6',
        trainerIndexes: [1],
      },
    ],
  },
];

function upcomingSessionSlots(count: number): Date[] {
  const slots: Date[] = [];
  const now = new Date();
  for (let i = 1; i <= count; i += 1) {
    const day = new Date(now);
    day.setDate(now.getDate() + i);
    day.setHours(9 + (i % 4) * 3, 0, 0, 0);
    slots.push(day);
  }
  return slots;
}

async function seedStudio(def: SeedStudio) {
  const slugMarker = `${SEED_SLUG_PREFIX}${def.key}`;
  const existing = await prisma.studio.findFirst({
    where: { slug: { startsWith: slugMarker } },
    select: { id: true, name: true, slug: true },
  });
  if (existing) {
    console.log(`⏭️  Skip (exists): ${existing.name} [${existing.slug}]`);
    return existing.id;
  }

  const owner = await prisma.user.upsert({
    where: { email: def.ownerEmail },
    update: { name: def.ownerName, role: UserRole.OWNER },
    create: {
      email: def.ownerEmail,
      name: def.ownerName,
      role: UserRole.OWNER,
    },
  });

  const photoGallery = def.photoUrls.map((url, index) =>
    photoGalleryEntry(`${def.key}-photo-${index + 1}`, url),
  );

  const studio = await prisma.studio.create({
    data: {
      name: def.name,
      description: def.descriptionEn,
      descriptionEn: def.descriptionEn,
      descriptionRu: def.descriptionRu,
      descriptionVi: def.descriptionVi,
      address: def.address,
      latitude: def.latitude,
      longitude: def.longitude,
      phone: def.phone,
      email: def.email,
      instagram: def.instagram,
      logoUrl: def.logoUrl,
      photos: def.photoUrls,
      photoGallery,
      status: StudioStatus.ACTIVE,
      autoConfirmBookings: true,
      timezone: 'Asia/Ho_Chi_Minh',
      ownerId: owner.id,
      reminderSettings: {
        intervals: [24],
        bookingPeriodDays: 30,
        trainingLocations: [],
        defaultLocationName: def.name,
      },
    },
  });

  const slug = `${SEED_SLUG_PREFIX}${def.key}-${studio.id}`;
  await prisma.studio.update({
    where: { id: studio.id },
    data: { slug },
  });

  await prisma.subscription.create({
    data: {
      studioId: studio.id,
      type: def.subscriptionType,
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(),
      updatedAt: new Date(),
    },
  });

  const trainerRecords = await Promise.all(
    def.trainers.map((trainer, index) =>
      prisma.trainer.create({
        data: {
          name: trainer.name,
          email: trainer.email,
          phone: trainer.phone,
          accessLevel: index === 0 ? 'ADMIN' : 'EMPLOYEE',
          studioId: studio.id,
        },
      }),
    ),
  );

  const trainingRecords = [];
  for (const training of def.trainings) {
    const created = await prisma.training.create({
      data: {
        name: training.name,
        description: training.description,
        duration: training.duration,
        price: training.price,
        displayColor: training.displayColor,
        trainingCategoryId: training.categoryId,
        studioId: studio.id,
        Trainer: {
          connect: training.trainerIndexes.map((idx) => ({
            id: trainerRecords[idx].id,
          })),
        },
      },
    });
    trainingRecords.push(created);
  }

  const slots = upcomingSessionSlots(trainingRecords.length);
  for (let i = 0; i < trainingRecords.length; i += 1) {
    const training = trainingRecords[i];
    const startsAt = slots[i];
    const endsAt = new Date(startsAt.getTime() + training.duration * 60_000);
    const trainer = trainerRecords[def.trainings[i].trainerIndexes[0] ?? 0];
    await prisma.trainingSession.create({
      data: {
        studioId: studio.id,
        trainingId: training.id,
        trainerId: trainer.id,
        locationId: 'default',
        startsAt,
        endsAt,
        capacity: 8 + i * 2,
        status: TrainingSessionStatus.ACTIVE,
      },
    });
  }

  console.log(
    `✅ Created: ${def.name} (${def.trainings.length} trainings, ${def.trainers.length} trainers)`,
  );
  return studio.id;
}

async function main() {
  console.log('🌱 Seeding demo studios into local staging DB...\n');

  for (const def of STUDIOS) {
    await seedStudio(def);
  }

  const total = await prisma.studio.count({
    where: { slug: { startsWith: SEED_SLUG_PREFIX } },
  });
  console.log(`\n🎉 Done. Seed demo studios in DB: ${total}`);
}

main()
  .catch((error) => {
    console.error('❌ seed-fake-studios failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
