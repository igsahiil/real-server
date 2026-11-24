import { Type, Static } from '@sinclair/typebox';

export const PropertyLocationSchema = Type.Object({
  country: Type.Optional(Type.String()),
  state: Type.Optional(Type.String()),
  city: Type.String({ minLength: 2 }),
  locality: Type.String({ minLength: 2 }),
  society: Type.Optional(Type.String()),
  pincode: Type.String({ minLength: 4 }),
  address: Type.String({ minLength: 5 }),
  coordinates: Type.Tuple([Type.Number(), Type.Number()]), // [lng, lat]
  boundary: Type.Optional(
    Type.Object({
      type: Type.Literal('Polygon'),
      coordinates: Type.Array(Type.Array(Type.Tuple([Type.Number(), Type.Number()]))),
    })
  ),
});

export const PropertyImageSchema = Type.Object({
  url: Type.String({ minLength: 5 }),
  publicId: Type.Optional(Type.String()),
  isCover: Type.Boolean({ default: false }),
});

export const CreatePropertyBodySchema = Type.Object({
  title: Type.String({ minLength: 5, maxLength: 200 }),
  description: Type.String({ minLength: 20, maxLength: 5000 }),
  listingType: Type.Union([Type.Literal('sale'), Type.Literal('rent'), Type.Literal('lease')]),
  category: Type.Union([Type.Literal('residential'), Type.Literal('commercial'), Type.Literal('plot_land')]),
  propertyType: Type.String({ minLength: 2 }),
  price: Type.Number({ minimum: 1 }),
  priceNegotiable: Type.Optional(Type.Boolean({ default: false })),
  maintenance: Type.Optional(Type.Number()),
  securityDeposit: Type.Optional(Type.Number()),
  location: PropertyLocationSchema,
  details: Type.Optional(Type.Record(Type.String(), Type.Any())),
  amenities: Type.Optional(Type.Array(Type.String())),
  images: Type.Array(PropertyImageSchema, { minItems: 1 }),
  videoUrl: Type.Optional(Type.String()),
  floorPlanUrl: Type.Optional(Type.String()),
});
export type CreatePropertyBody = Static<typeof CreatePropertyBodySchema>;

export const UpdatePropertyBodySchema = Type.Partial(CreatePropertyBodySchema);
export type UpdatePropertyBody = Static<typeof UpdatePropertyBodySchema>;

export const VerifyPropertyBodySchema = Type.Object({
  status: Type.Union([Type.Literal('approved'), Type.Literal('rejected')]),
  rejectionReason: Type.Optional(Type.String({ maxLength: 500 })),
});
export type VerifyPropertyBody = Static<typeof VerifyPropertyBodySchema>;
