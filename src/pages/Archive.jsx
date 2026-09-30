import PageHeader from '../components/PageHeader';
import { StayList } from './Stays';

export default function Archive() {
  return (
    <>
      <PageHeader title="Arhiva" subtitle="Prošli boravci" />
      <StayList archive />
    </>
  );
}
