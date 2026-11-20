export const demoJobs = [
  {
    id: 'CL-2481',
    type: 'Home shifting',
    description: 'Move boxes and a sofa from the 2nd floor to the loading bay.',
    workers: 3,
    duration: 2,
    date: new Date(Date.now() + 86_400_000).toISOString(),
    location: { lat: 12.9718, lng: 77.5948, address: 'Indiranagar, Bengaluru' },
    status: 'assigned',
    price: 1800,
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    crew: [
      { id: 'w-14', name: 'Ravi Kumar', rating: 4.9, distance: '1.2 km', location: { lat: 12.9687, lng: 77.5901 } },
      { id: 'w-27', name: 'Nikhil Das', rating: 4.8, distance: '1.8 km', location: { lat: 12.9738, lng: 77.5994 } },
      { id: 'w-31', name: 'Sameer Ali', rating: 4.9, distance: '2.1 km', location: { lat: 12.9750, lng: 77.5980 } }
    ]
  },
  {
    id: 'CL-2472',
    type: 'Loading help',
    description: 'Load cartons into a delivery van.',
    workers: 2,
    duration: 1,
    date: new Date(Date.now() - 86_400_000).toISOString(),
    location: { lat: 12.9634, lng: 77.5855, address: 'Richmond Town, Bengaluru' },
    status: 'completed',
    price: 600,
    createdAt: new Date(Date.now() - 172_800_000).toISOString(),
    crew: [
      { id: 'w-14', name: 'Ravi Kumar', rating: 4.9, distance: '1.2 km', location: { lat: 12.9687, lng: 77.5901 } },
      { id: 'w-35', name: 'Imran Khan', rating: 4.7, distance: '2.4 km', location: { lat: 12.9671, lng: 77.5972 } }
    ]
  },
  {
    id: 'CL-2468',
    type: 'Furniture shifting',
    description: 'Shift a dining table and six chairs between floors.',
    workers: 2,
    duration: 2,
    date: new Date(Date.now() - 259_200_000).toISOString(),
    location: { lat: 12.9782, lng: 77.6033, address: 'Domlur, Bengaluru' },
    status: 'cancelled',
    price: 1200,
    createdAt: new Date(Date.now() - 345_600_000).toISOString(),
    crew: []
  }
];

export const mockJobs = [...demoJobs];

export const demoRequests = [
  { id: 'REQ-51', jobId: 'CL-2488', type: 'Furniture loading', distance: 1.4, duration: 2, pay: 720, address: '12th Main Road, Indiranagar', expiresAt: Date.now() + 54_000 },
  { id: 'REQ-52', jobId: 'CL-2490', type: 'Home shifting', distance: 2.8, duration: 3, pay: 1080, address: 'Koramangala 5th Block', expiresAt: Date.now() + 86_000 }
];

export const demoWorkers = [
  {
    id: 'w-14',
    name: 'Ravi Kumar',
    email: 'ravi@example.com',
    phone: '+91 98765 43210',
    rating: 4.9,
    jobs: 126,
    status: 'approved',
    location: { lat: 12.9687, lng: 77.5901 },
    availability_status: 'available',
    location_sharing_enabled: true,
    last_location_update: new Date().toISOString(),
    skills: ['Home shifting', 'Furniture shifting', 'Loading help', 'Warehouse loading', 'Other manual work']
  },
  {
    id: 'w-27',
    name: 'Nikhil Das',
    email: 'nikhil@example.com',
    phone: '+91 98450 12345',
    rating: 4.8,
    jobs: 94,
    status: 'approved',
    location: { lat: 12.9738, lng: 77.5994 },
    availability_status: 'available',
    location_sharing_enabled: true,
    last_location_update: new Date().toISOString(),
    skills: ['Home shifting', 'Furniture shifting', 'Loading help', 'Warehouse loading', 'Other manual work']
  },
  {
    id: 'w-35',
    name: 'Imran Khan',
    email: 'imran@example.com',
    phone: '+91 99001 22334',
    rating: 4.7,
    jobs: 71,
    status: 'approved',
    location: { lat: 12.9671, lng: 77.5972 },
    availability_status: 'available',
    location_sharing_enabled: true,
    last_location_update: new Date().toISOString(),
    skills: ['Loading help', 'Other manual work', 'Furniture shifting'],
    idProof: 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=900&q=80'
  }
];

export const demoUsers = [
  { id: 'u-101', name: 'Maya Patel', email: 'maya@example.com', role: 'requester', status: 'active', joined: '2026-04-12' },
  ...demoWorkers.map((worker) => ({ id: worker.id, name: worker.name, email: worker.email, role: 'worker', status: worker.status, joined: '2026-05-04' })),
  { id: 'u-302', name: 'Kabir Mehta', email: 'kabir@example.com', role: 'requester', status: 'active', joined: '2026-06-18' }
];
