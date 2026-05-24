import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      admin: {
        createUser: jest.fn(),
        updateUserById: jest.fn(),
        getUserById: jest.fn(),
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
    };
    const emailService = {
      sendEmail: jest.fn(),
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

    return { service, prisma, emailService };
  };

  it('stores client OTP in DB and sends verification email', async () => {
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
    expect(upsertPayload.create.payload.kind).toBe('client');
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('stores owner OTP in DB and sends verification email', async () => {
    const { service, prisma, emailService } = makeService();
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await service.requestOwnerRegistrationCode({
      email: 'owner@example.com',
      password: 'secret123',
      name: 'Owner',
    });

    expect(result).toEqual({ success: true });
    expect(prisma.clientRegistrationOtp.upsert).toHaveBeenCalledTimes(1);
    const upsertPayload = prisma.clientRegistrationOtp.upsert.mock.calls[0][0];
    expect(upsertPayload.create.payload.kind).toBe('owner');
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('verifies client OTP and delegates to registerClient', async () => {
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
        kind: 'client',
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

  it('rejects verification after max attempts', async () => {
    const { service, prisma } = makeService();
    prisma.clientRegistrationOtp.findUnique.mockResolvedValue({
      email: 'user@example.com',
      codeHash: (service as any).hashOtpCode('123456'),
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 5,
      payload: { kind: 'client' },
    });

    await expect(
      service.verifyClientRegistrationCode({
        email: 'user@example.com',
        code: '000000',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
