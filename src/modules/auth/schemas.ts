import { Type, Static } from '@sinclair/typebox';

export const RegisterBodySchema = Type.Object({
  name: Type.String({ minLength: 2, maxLength: 100 }),
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 6, maxLength: 100 }),
  phone: Type.Optional(Type.String({ minLength: 7, maxLength: 20 })),
});
export type RegisterBody = Static<typeof RegisterBodySchema>;

export const RegisterAgentBodySchema = Type.Object({
  name: Type.String({ minLength: 2, maxLength: 100 }),
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 6, maxLength: 100 }),
  phone: Type.Optional(Type.String({ minLength: 7, maxLength: 20 })),
  agencyName: Type.Optional(Type.String({ minLength: 2, maxLength: 150 })),
  licenseNo: Type.Optional(Type.String({ minLength: 2, maxLength: 100 })),
  idProofUrl: Type.Optional(Type.String({ minLength: 2 })),
  address: Type.Optional(Type.String({ minLength: 5, maxLength: 300 })),
  bio: Type.Optional(Type.String({ maxLength: 1000 })),
});
export type RegisterAgentBody = Static<typeof RegisterAgentBodySchema>;

export const LoginBodySchema = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 1 }),
});
export type LoginBody = Static<typeof LoginBodySchema>;

export const VerifyAgentBodySchema = Type.Object({
  status: Type.Union([
    Type.Literal('approved'),
    Type.Literal('rejected'),
    Type.Literal('suspended'),
  ]),
  rejectionReason: Type.Optional(Type.String({ maxLength: 500 })),
});
export type VerifyAgentBody = Static<typeof VerifyAgentBodySchema>;
