import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      admin: {
        createUser: jest.fn(),
        listUsers: jest.fn(),
        updateUserById: jest.fn(),
        getUserById: jest.fn(),
        generateLink: jest.fn(),
      },
    },
  },
}));

describe('AuthService email flows', () => {
  const makeService = () => {
    const prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      clientRegistrationOtp: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },
      pendingBusinessRegistration: {
        findFirst: jest.fn(),
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
    };
    const emailService = {
      sendEmail: jest.fn(),
      sendBusinessRegistrationMagicLink: jest.fn(),
    };
    const configService = { get: jest.fn() };
    const jwtVerifier = {
      verifyToken: jest.fn(),
      getUserIdFromToken: jest.fn(),
      getEmailFromToken: jest.fn(),
    };

    const service = new AuthService(
      prisma as any,
      emailService as any,
      configService as any,
      jwtVerifier as any,
    );

    return { service, prisma, emailService, configService };
  };

  it('stores OTP in DB and sends verification email', async () => {
    const { service, prisma, emailService } = makeService();
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await service.requestClientRegistrationCode({
      email: 'User@Example.com',
      password: 'secret123',
      name: 'User',
    });

    expect(result).toEqual({ success: true });
    expect(prisma.clientRegistrationOtp.upsert).toHaveBeenCalledTimes(1);
    const upsertPayload = prisma.clientRegistrationOtp.upsert.mock.calls[0][0];
    expect(upsertPayload.where.email).toBe('user@example.com');
    expect(upsertPayload.create.codeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('verifies OTP from DB and delegates to registerClient', async () => {
    const { service, prisma } = makeService();
    const registerClientSpy = jest
      .spyOn(service, 'registerClient')
      .mockResolvedValue({ user: { id: 'u1' } } as any);

    prisma.clientRegistrationOtp.findUnique.mockResolvedValue({
      email: 'user@example.com',
      codeHash: (service as any).hashOtpCode('123456'),
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 0,
      payload: {
        email: 'user@example.com',
        password: 'secret123',
      },
    });

    const result = await service.verifyClientRegistrationCode({
      email: 'user@example.com',
      code: '123456',
    });

    expect(result).toEqual({ user: { id: 'u1' } });
    expect(prisma.clientRegistrationOtp.delete).toHaveBeenCalledWith({
      where: { email: 'user@example.com' },
    });
    expect(registerClientSpy).toHaveBeenCalledTimes(1);
  });

  it('sends business magic link and stores pending registration with userId', async () => {
    const { service, prisma, emailService, configService } = makeService();
    const { supabase } = jest.requireMock('../lib/supabase');

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.pendingBusinessRegistration.findFirst.mockResolvedValue(null);
    prisma.pendingBusinessRegistration.deleteMany.mockResolvedValue({
      count: 0,
    });
    prisma.pendingBusinessRegistration.create.mockResolvedValue({
      id: 'pending-1',
    });
    prisma.user.create.mockResolvedValue({
      id: 'supabase-user-id',
      email: 'owner@example.com',
      role: 'OWNER',
      name: 'Owner',
    });

    supabase.auth.admin.listUsers.mockResolvedValue({
      data: { users: [] },
      error: null,
    });
    supabase.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: 'supabase-user-id' } },
      error: null,
    });
    configService.get.mockReturnValue(undefined);

    const result = await service.sendBusinessMagicLink(
      'owner@example.com',
      'Owner',
      'secret123',
      'en',
    );

    expect(result).toEqual({ success: true, token: 'pending-1' });
    expect(prisma.pendingBusinessRegistration.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'supabase-user-id',
        }),
      }),
    );
    expect(
      emailService.sendBusinessRegistrationMagicLink,
    ).toHaveBeenCalledTimes(1);
  });

  it('rejects verification after max attempts', async () => {
    const { service, prisma } = makeService();
    prisma.clientRegistrationOtp.findUnique.mockResolvedValue({
      email: 'user@example.com',
      codeHash: (service as any).hashOtpCode('123456'),
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 5,
      payload: {},
    });

    await expect(
      service.verifyClientRegistrationCode({
        email: 'user@example.com',
        code: '000000',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
