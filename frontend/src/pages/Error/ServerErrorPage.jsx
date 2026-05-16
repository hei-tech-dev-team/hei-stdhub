import ErrorPage from "../../components/ui/ErrorPage";

const ServerErrorPage = () => {
  return (
    <ErrorPage 
      code="500"
      title="Erreur serveur"
      message="Une erreur inattendue s'est produite de notre côté. 
               Nos équipes ont été notifiées et travaillent à résoudre le problème."
      estimatedTime="Quelques minutes"
      showRetry={true}
    />
  );
};

export default ServerErrorPage;