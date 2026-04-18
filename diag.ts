import 'dotenv/config';
import prisma from "./src/config/prisma.config.js";

async function diag() {
  try {
    const orgs = await prisma.organization.findMany();
    const members = await prisma.member.findMany();
    const doctors = await prisma.doctor.findMany();
    const patients = await prisma.patient.findMany();
    const appointments = await prisma.appointment.findMany();

    console.log('--- DATABASE DIAGNOSTIC ---');
    console.log('Total Organizations:', orgs.length);
    
    console.log('Total Members:', members.length);
    console.log('Total Doctors:', doctors.length);
    console.log('Total Patients:', patients.length);
    console.log('Total Appointments:', appointments.length);
    
    const orgCounts = await Promise.all(orgs.map(async (o) => {
        const d = await prisma.doctor.count({ where: { organizationId: o.id } });
        const p = await prisma.patient.count({ where: { organizationId: o.id } });
        const a = await prisma.appointment.count({ where: { organizationId: o.id } });
        return { id: o.id, name: o.name, d, p, a };
    }));

    console.log('--- DATA DISTRIBUTION BY ORG ---');
    orgCounts.forEach(oc => {
        console.log(`Org: ${oc.name} (${oc.id}) -> Doctors: ${oc.d}, Patients: ${oc.p}, Appointments: ${oc.a}`);
    });

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

diag();
