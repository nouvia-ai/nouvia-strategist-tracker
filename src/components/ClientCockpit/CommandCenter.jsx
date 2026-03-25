import BusinessObjectives from './BusinessObjectives';
import IssuesBlockers from './IssuesBlockers';
import SCorPillarProgress from './SCorPillarProgress';
import IdeasQueue from './IdeasQueue';

export default function CommandCenter() {
  const clientId = 'ivc';

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BusinessObjectives clientId={clientId} />
        <IssuesBlockers clientId={clientId} />
      </div>
      <SCorPillarProgress clientId={clientId} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <IdeasQueue clientId={clientId} />
        <div />
      </div>
    </div>
  );
}
