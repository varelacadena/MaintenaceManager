import ServiceRequestForm from '../ServiceRequestForm';

export default function ServiceRequestFormExample() {
  return (
    <div className="max-w-2xl p-6">
      <ServiceRequestForm onSubmit={(data) => console.log('Form submitted:', data)} />
    </div>
  );
}
