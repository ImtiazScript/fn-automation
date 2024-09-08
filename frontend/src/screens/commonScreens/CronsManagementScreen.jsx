import CronsDataTable from '../../components/CommonComponents/CronDataTable';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useGetCronsDataMutation, useGetTypesOfWorkOrderMutation } from '../../slices/commonApiSlice';
import Loader from '../../components/Loader';

const CronsManagementScreen = () => {
  const [cronsData, setCronsData] = useState([]);
  const [cronsDataFromAPI, { isLoading }] = useGetCronsDataMutation();
  const [typesOfWorkOrder, setTypesOfWorkOrder] = useState([]);
  const [typesOfWorkOrderFromAPI, { isLoadingTypesOfWorkOrder }] =
    useGetTypesOfWorkOrderMutation();

  useEffect(() => {
    try {
      const fetchData = async () => {
        const responseFromApiCall = await cronsDataFromAPI();
        const cronsArray = responseFromApiCall.data.cronsData;
        setCronsData(cronsArray);

        // Getting types of work order
        const typesOfWorkOrderFromApiCall = await typesOfWorkOrderFromAPI();
        const typesOfWorkOrderArray = typesOfWorkOrderFromApiCall.data;
        setTypesOfWorkOrder(typesOfWorkOrderArray);
      };
      fetchData();
    } catch (err) {
      toast.error(err?.data?.errors[0]?.message || err);
      console.error('Error fetching crons:', err);
    }
  }, []);

  return (
    <div>
      <h1>Crons List</h1>
      {(isLoading || isLoadingTypesOfWorkOrder) ? <Loader /> : <CronsDataTable crons={cronsData} typesOfWorkOrder={typesOfWorkOrder}/>}
    </div>
  );
};

export default CronsManagementScreen;
