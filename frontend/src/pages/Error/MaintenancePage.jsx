import ErrorPage from "../../components/ui/ErrorPage";

const MaintenancePage = () => {
  return (
    <ErrorPage 
      code="503"
      title="Maintenance en cours"
      message="Nous effectuons actuellement une maintenance pour améliorer votre expérience. 
               L'équipe technique travaille activement pour remettre la plateforme en ligne rapidement."
      estimatedTime="30 à 45 minutes"
      showRetry={true}
    />
  );
};

export default MaintenancePage;