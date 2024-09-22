import CronConfigure from '../../components/CommonComponents/CronConfigure';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  useGetCronDataMutation,
  useGetTypesOfWorkOrderMutation,
} from '../../slices/commonApiSlice';
import Loader from '../../components/Loader';
import { Breadcrumb } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const CronConfigureScreen = () => {
  const { cronId } = useParams();
  const [cronData, setCronData] = useState([]);
  const [cronDataFromAPI, { isLoading }] = useGetCronDataMutation();

  const [typesOfWorkOrder, setTypesOfWorkOrder] = useState([]);
  const [typesOfWorkOrderFromAPI, { isLoadingTypesOfWorkOrder }] =
    useGetTypesOfWorkOrderMutation();

  useEffect(() => {
    try {
      const fetchData = async () => {
        // Getting cron config detail
        const responseFromApiCall = await cronDataFromAPI(cronId);
        const cronArray = responseFromApiCall.data.cronData;
        setCronData(cronArray);

        // Getting types of work order
        const typesOfWorkOrderFromApiCall = await typesOfWorkOrderFromAPI();
        const typesOfWorkOrderArray = typesOfWorkOrderFromApiCall.data;
        setTypesOfWorkOrder(typesOfWorkOrderArray);
      };

      fetchData();
    } catch (err) {
      toast.error(err?.data?.message || err);
      console.error('Error fetching crons:', err);
    }
  }, []);

  return (
    <div>
      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>
          Home
        </Breadcrumb.Item>
        <Breadcrumb.Item
          linkAs={Link}
          linkProps={{ to: '/crons/manage-crons' }}
        >
          Manage Crons
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Cron Details</Breadcrumb.Item>
      </Breadcrumb>
      {isLoading || isLoadingTypesOfWorkOrder ? (
        <Loader />
      ) : (
        <CronConfigure cron={cronData} typesOfWorkOrder={typesOfWorkOrder} />
      )}
    </div>
  );
};

export default CronConfigureScreen;
