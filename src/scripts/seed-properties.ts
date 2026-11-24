import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { Property } from '../models/Property.js';
import { User } from '../models/User.js';
import { generatePropertySlug } from '../utils/slug.js';

async function seedProperties() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(config.mongodbUri);

  // Find or create an admin or agent user as the listing owner
  let owner = await User.findOne({ role: 'admin' });
  if (!owner) {
    owner = await User.findOne({});
  }

  if (!owner) {
    throw new Error('No user found in database to assign property listings to.');
  }

  console.log('Using owner ID:', owner._id, '(', owner.email, ')');

  // Realistic verified properties in Ahmedabad and Gandhinagar matching the map locations in the reference image
  const propertiesData = [
    {
      title: '3 BHK Independent House',
      description: 'Luxurious 3 BHK independent house in prime Sargasan, Gandhinagar. Features private garden, premium Italian marble flooring, modular kitchen, and covered car parking.',
      listingType: 'sale',
      category: 'residential',
      propertyType: 'Villa / Bungalow',
      price: 12500000, // ₹ 1.25 Cr
      pricingUnit: 'total',
      status: 'approved',
      isFeatured: true,
      features: {
        bedrooms: 3,
        bathrooms: 2,
        balconies: 2,
        superBuiltUpArea: 1850,
        carpetArea: 1420,
        areaUnit: 'sq_ft',
        furnishing: 'semi_furnished',
        possessionStatus: 'ready_to_move',
      },
      location: {
        country: 'India',
        state: 'Gujarat',
        city: 'Gandhinagar',
        locality: 'Sargasan',
        society: 'Shree Rang Oasis',
        pincode: '382421',
        address: 'Plot 42, Sargasan Cross Road, Gandhinagar',
        geo: {
          type: 'Point',
          coordinates: [72.6178, 23.1895], // [lng, lat] Sargasan Gandhinagar
        },
      },
      images: [
        {
          url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
          isCover: true,
        },
        {
          url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80',
          isCover: false,
        },
      ],
    },
    {
      title: '4 BHK Luxury Sky Villa',
      description: 'Exclusive 4 BHK ultra-luxury penthouse with private plunge pool, panoramic views of SG Highway and Gandhinagar skyline.',
      listingType: 'sale',
      category: 'residential',
      propertyType: 'Penthouse',
      price: 18500000, // ₹ 1.85 Cr
      pricingUnit: 'total',
      status: 'approved',
      isFeatured: true,
      features: {
        bedrooms: 4,
        bathrooms: 4,
        balconies: 3,
        superBuiltUpArea: 2850,
        carpetArea: 2200,
        areaUnit: 'sq_ft',
        furnishing: 'furnished',
        possessionStatus: 'ready_to_move',
      },
      location: {
        country: 'India',
        state: 'Gujarat',
        city: 'Gandhinagar',
        locality: 'Kudasan',
        society: 'The Grand Skyway',
        pincode: '382421',
        address: 'Near Bhaijipura Cross Road, Kudasan',
        geo: {
          type: 'Point',
          coordinates: [72.6340, 23.2085], // [lng, lat]
        },
      },
      images: [
        {
          url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&auto=format&fit=crop&q=80',
          isCover: true,
        },
      ],
    },
    {
      title: '3 BHK High-Rise Apartment',
      description: 'Spacious 3 BHK apartment in Gota / Chandkheda with modern amenities including club house, swimming pool, and landscaped jogging track.',
      listingType: 'sale',
      category: 'residential',
      propertyType: 'Apartment / Flat',
      price: 9200000, // ₹ 92 L
      pricingUnit: 'total',
      status: 'approved',
      isFeatured: true,
      features: {
        bedrooms: 3,
        bathrooms: 3,
        balconies: 2,
        superBuiltUpArea: 1650,
        carpetArea: 1250,
        areaUnit: 'sq_ft',
        furnishing: 'unfurnished',
        possessionStatus: 'ready_to_move',
      },
      location: {
        country: 'India',
        state: 'Gujarat',
        city: 'Ahmedabad',
        locality: 'Chandkheda',
        society: 'Devnandan Heights',
        pincode: '382424',
        address: 'Near New C.G. Road, Chandkheda',
        geo: {
          type: 'Point',
          coordinates: [72.5855, 23.1118], // [lng, lat]
        },
      },
      images: [
        {
          url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80',
          isCover: true,
        },
      ],
    },
    {
      title: '4 BHK Grand Residency',
      description: 'Palatial 4 BHK residence in Bodakdev / Thaltej. 100% Vastu compliant, east facing, dual car parking, and designer interiors.',
      listingType: 'sale',
      category: 'residential',
      propertyType: 'Apartment / Flat',
      price: 21000000, // ₹ 2.10 Cr
      pricingUnit: 'total',
      status: 'approved',
      isFeatured: true,
      features: {
        bedrooms: 4,
        bathrooms: 4,
        balconies: 3,
        superBuiltUpArea: 3200,
        carpetArea: 2450,
        areaUnit: 'sq_ft',
        furnishing: 'furnished',
        possessionStatus: 'ready_to_move',
      },
      location: {
        country: 'India',
        state: 'Gujarat',
        city: 'Ahmedabad',
        locality: 'Bodakdev',
        society: 'The Royal Heritage',
        pincode: '380054',
        address: 'Judges Bungalow Road, Bodakdev',
        geo: {
          type: 'Point',
          coordinates: [72.5085, 23.0482], // [lng, lat]
        },
      },
      images: [
        {
          url: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=800&auto=format&fit=crop&q=80',
          isCover: true,
        },
      ],
    },
    {
      title: '3 BHK Contemporary Flat',
      description: 'Elegant 3 BHK apartment in South Bopal with serene garden views, clubhouse access, and rapid connectivity to SP Ring Road.',
      listingType: 'sale',
      category: 'residential',
      propertyType: 'Apartment / Flat',
      price: 9500000, // ₹ 95 L
      pricingUnit: 'total',
      status: 'approved',
      isFeatured: true,
      features: {
        bedrooms: 3,
        bathrooms: 3,
        balconies: 2,
        superBuiltUpArea: 1720,
        carpetArea: 1310,
        areaUnit: 'sq_ft',
        furnishing: 'semi_furnished',
        possessionStatus: 'ready_to_move',
      },
      location: {
        country: 'India',
        state: 'Gujarat',
        city: 'Ahmedabad',
        locality: 'Bopal',
        society: 'Aarohi Crest',
        pincode: '380058',
        address: 'Near Gala Gymkhana Road, South Bopal',
        geo: {
          type: 'Point',
          coordinates: [72.4635, 23.0315], // [lng, lat]
        },
      },
      images: [
        {
          url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80',
          isCover: true,
        },
      ],
    },
    {
      title: '2 BHK Modern Home',
      description: 'Affordable and well-ventilated 2 BHK apartment in Vastral near Metro Station. Ideal for families and young professionals.',
      listingType: 'sale',
      category: 'residential',
      propertyType: 'Apartment / Flat',
      price: 7800000, // ₹ 78 L
      pricingUnit: 'total',
      status: 'approved',
      isFeatured: true,
      features: {
        bedrooms: 2,
        bathrooms: 2,
        balconies: 1,
        superBuiltUpArea: 1280,
        carpetArea: 980,
        areaUnit: 'sq_ft',
        furnishing: 'semi_furnished',
        possessionStatus: 'ready_to_move',
      },
      location: {
        country: 'India',
        state: 'Gujarat',
        city: 'Ahmedabad',
        locality: 'Vastral',
        society: 'Shree Radhe Residency',
        pincode: '382418',
        address: 'Near Nirant Cross Road, Vastral',
        geo: {
          type: 'Point',
          coordinates: [72.6515, 22.9985], // [lng, lat]
        },
      },
      images: [
        {
          url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80',
          isCover: true,
        },
      ],
    },
    {
      title: 'Corporate Office Space',
      description: 'Grade-A fully furnished commercial office space on SG Highway near Science City. Features conference room, 40 workstations, and executive cabins.',
      listingType: 'rent',
      category: 'commercial',
      propertyType: 'Commercial Office',
      price: 85000, // ₹ 85,000 / month
      pricingUnit: 'month',
      status: 'approved',
      isFeatured: true,
      features: {
        superBuiltUpArea: 2200,
        carpetArea: 1650,
        areaUnit: 'sq_ft',
        furnishing: 'furnished',
        possessionStatus: 'ready_to_move',
      },
      location: {
        country: 'India',
        state: 'Gujarat',
        city: 'Ahmedabad',
        locality: 'Science City',
        society: 'Mondeal Heights',
        pincode: '380060',
        address: 'Science City Road, Sola',
        geo: {
          type: 'Point',
          coordinates: [72.5180, 23.0795], // [lng, lat]
        },
      },
      images: [
        {
          url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80',
          isCover: true,
        },
      ],
    },
    {
      title: 'Prime Residential Villa Plot',
      description: 'Clear title NA/NOC residential plot in gated community near Sanand. Surrounded by lush greenery with club amenities.',
      listingType: 'sale',
      category: 'plot_land',
      propertyType: 'Residential Plot',
      price: 4500000, // ₹ 45 L
      pricingUnit: 'total',
      status: 'approved',
      isFeatured: false,
      features: {
        plotArea: 350,
        areaUnit: 'sq_yd',
        possessionStatus: 'ready_to_move',
      },
      location: {
        country: 'India',
        state: 'Gujarat',
        city: 'Ahmedabad',
        locality: 'Sanand',
        society: 'Greenwoods Villa Scheme',
        pincode: '382110',
        address: 'Sanand-Bavla Road',
        geo: {
          type: 'Point',
          coordinates: [72.3785, 22.9810], // [lng, lat]
        },
        boundary: {
          type: 'Polygon',
          coordinates: [[
            [72.3775, 22.9800],
            [72.3795, 22.9800],
            [72.3795, 22.9820],
            [72.3775, 22.9820],
            [72.3775, 22.9800],
          ]],
        },
      },
      images: [
        {
          url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80',
          isCover: true,
        },
      ],
    },
  ];

  for (const item of propertiesData) {
    const slug = generatePropertySlug(item.title, item.location.city, item.location.locality);
    await Property.create({
      ...item,
      agentId: owner._id,
      slug,
      publishedAt: new Date(),
    });
    console.log(`Created property: ${item.title} (${item.location.city})`);
  }

  const finalCount = await Property.countDocuments();
  console.log(`Successfully seeded properties! Total in database: ${finalCount}`);

  await mongoose.disconnect();
}

seedProperties().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
