import ErrorPage from "../../components/ui/ErrorPage";

const NotFoundPage = () => {
  return (
    <ErrorPage 
      code="404"
      title="Page non trouvée"
      message="Désolé, la page que vous recherchez n'existe pas ou a été déplacée."
      estimatedTime={null}
      showRetry={false}
    />
  );
};

export default NotFoundPage;