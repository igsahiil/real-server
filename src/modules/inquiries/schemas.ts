import { Type, Static } from '@sinclair/typebox';

export const CreateInquiryBodySchema = Type.Object({
  propertyId: Type.String({ minLength: 10 }),
  name: Type.String({ minLength: 2, maxLength: 100 }),
  email: Type.String({ format: 'email' }),
  phone: Type.String({ minLength: 7, maxLength: 20 }),
  message: Type.String({ minLength: 5, maxLength: 2000 }),
  preferredTime: Type.Optional(Type.String({ maxLength: 100 })),
});
export type CreateInquiryBody = Static<typeof CreateInquiryBodySchema>;

export const UpdateInquiryStatusBodySchema = Type.Object({
  status: Type.Union([Type.Literal('new'), Type.Literal('contacted'), Type.Literal('closed')]),
  notes: Type.Optional(Type.String({ maxLength: 1000 })),
});
export type UpdateInquiryStatusBody = Static<typeof UpdateInquiryStatusBodySchema>;
