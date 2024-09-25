import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Row,
  Col,
  Form as BootstrapForm,
  Alert,
} from 'react-bootstrap';
import Select from 'react-select'; // Assuming you're using react-select for multi-select
import TimeZoneSelect from '../utils/TimeZoneSelect';
import { toast } from 'react-toastify';
import { useUpdateCronByCronIdMutation } from '../../slices/commonApiSlice';
import { useAddCronMutation } from '../../slices/commonApiSlice';
import { useGetProvidersMutation } from '../../slices/adminApiSlice';
import { useSelector } from 'react-redux';

const CronConfigModal = ({
  cron = {},
  showEditModal,
  setShowEditModal,
  typesOfWorkOrder,
}) => {
  const [updateCron] = useUpdateCronByCronIdMutation();
  const [currentStep, setCurrentStep] = useState(0);
  const { userInfo } = useSelector((state) => state.auth);
  const [activeProvidersFromAPI, { isLoadingActiveProviders }] =
    useGetProvidersMutation();
  const [activeProviders, setActiveProviders] = useState([]);
  const [addCron] = useAddCronMutation();
  const [workOrderTypeOptions, setWorkOrderTypeOptions] = useState([]);
  const [isFormValid, setIsFormValid] = useState(false);

  const [formData, setFormData] = useState({
    user: 0,
    cronStartAt: '',
    cronEndAt: '',
    workingWindowStartAt: '',
    workingWindowEndAt: '',
    drivingRadius: '',
    status: '',
    centerZip: '',
    // Request configuration
    isFixed: false,
    fixedPayment: '',
    isHourly: false,
    hourlyPayment: '',
    isPerDevice: false,
    perDevicePayment: '',
    isBlended: false,
    firstHourlyPayment: '',
    additionalHourlyPayment: '',
    // Counter offer
    isEnabledCounterOffer: false,
    // Time-off and Off-day
    offDays: [],
    timeOffStartAt: '',
    timeOffEndAt: '',
    timeZone: '',
  });

  useEffect(() => {
    if (cron) {
      setFormData({
        cronStartAt: cron.cronStartAt,
        cronEndAt: cron.cronEndAt,
        workingWindowStartAt: cron.workingWindowStartAt,
        workingWindowEndAt: cron.workingWindowEndAt,
        drivingRadius: cron.drivingRadius,
        status: cron.status,
        centerZip: cron.centerZip,
        // Request configuration
        isFixed: cron.isFixed || false,
        fixedPayment: cron.fixedPayment,
        isHourly: cron.isHourly || false,
        hourlyPayment: cron.hourlyPayment,
        isPerDevice: cron.isPerDevice || false,
        perDevicePayment: cron.perDevicePayment,
        isBlended: cron.isBlended || false,
        firstHourlyPayment: cron.firstHourlyPayment,
        additionalHourlyPayment: cron.additionalHourlyPayment,
        // Counter offer
        isEnabledCounterOffer: cron.isEnabledCounterOffer || false,
        offDays: cron.offDays || [],
        timeOffStartAt: cron.timeOffStartAt,
        timeOffEndAt: cron.timeOffEndAt,
        timeZone: cron.timeZone,
        scheduleChangeNote: cron.scheduleChangeNote,
        paymentChangeNote: cron.paymentChangeNote,
        scheduleAndPayChangeNote: cron.scheduleAndPayChangeNote,
      });
    }
  }, [cron && Object.keys(cron).length > 0]);

  const formatDateForInput = (dateTime) => {
    if (!dateTime) return '';

    // Split the dateTime string into date and time parts
    const [date, time] = dateTime.split('T');
    const [year, month, day] = date.split('-');
    let [hours, minutes] = time.split(':');

    // Ensure hours and minutes are two digits for proper input formatting
    hours = hours.padStart(2, '0');
    minutes = minutes.padStart(2, '0');

    // Return the date in the correct format for input
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleProviderChange = (selectedUser) => {
    setFormData({ ...formData, user: selectedUser });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleOffDayChange = (e) => {
    const value = e.target.value;
    setFormData((prevData) => ({
      ...prevData,
      offDays: prevData.offDays.includes(value)
        ? prevData.offDays.filter((day) => day !== value)
        : [...prevData.offDays, value],
    }));
  };

  const allWorkOrderTypeOptions = typesOfWorkOrder.map((type) => ({
    value: type.fnTypeId.toString(), // Convert to string if necessary
    label: type.fnTypeName,
  }));

  const handleWorkOrderTypeChange = (selectedOptions) => {
    setWorkOrderTypeOptions(selectedOptions);
  };

  // Effect to update workOrderTypeOptions based on selectedWorkOrderTypesIds
  useEffect(() => {
    if (
      typesOfWorkOrder.length > 0 &&
      cron.typesOfWorkOrder &&
      cron.typesOfWorkOrder.length > 0
    ) {
      const previouslySelectedOptions = typesOfWorkOrder
        .filter((type) =>
          cron.typesOfWorkOrder.includes(type.fnTypeId.toString()),
        )
        .map((type) => ({
          value: type.fnTypeId.toString(),
          label: type.fnTypeName,
        }));
      setWorkOrderTypeOptions(previouslySelectedOptions);
    }
  }, [cron.typesOfWorkOrder, typesOfWorkOrder]);

  useEffect(() => {
    try {
      const fetchData = async () => {
        if (activeProviders && !activeProviders.length) {
          // Getting activeProviders
          const activeProvidersFromAPICall = await activeProvidersFromAPI();
          const activeProvidersArray =
            activeProvidersFromAPICall.data.providers;
          setActiveProviders(activeProvidersArray);
        }
      };
      fetchData();
    } catch (err) {
      toast.error(err?.data?.message || err);
      console.error('Error fetching active providers:', err);
    }
  }, []);

  const allActiveProvidersOptions =
    activeProviders && activeProviders.length
      ? activeProviders.map((provider) => ({
          value: provider.userId,
          label: provider.name,
        }))
      : [];

  useEffect(() => {
    let isValid =
      formData.cronStartAt &&
      formData.cronEndAt &&
      formData.workingWindowStartAt &&
      formData.workingWindowEndAt &&
      formData.drivingRadius &&
      formData.status &&
      formData.centerZip &&
      formData.timeZone &&
      workOrderTypeOptions.length > 0;
    if (userInfo.isAdmin) {
      // making sure, provider is also selected
      isValid = isValid && formData.user;
    }
    setIsFormValid(isValid);
  }, [formData, workOrderTypeOptions]);

  const handleSaveChanges = async () => {
    const selectedFnTypeIds = workOrderTypeOptions.map(
      (workOrderType) => workOrderType.value,
    );
    try {
      // Prepare the data to be sent
      const data = {
        userId: userInfo.isAdmin && formData.user ? formData.user?.value : 0,
        cronId: cron.cronId,
        centerZip: formData.centerZip,
        cronStartAt: formData.cronStartAt,
        cronEndAt: formData.cronEndAt,
        workingWindowStartAt: formData.workingWindowStartAt,
        workingWindowEndAt: formData.workingWindowEndAt,
        drivingRadius: formData.drivingRadius,
        status: formData.status,
        typesOfWorkOrder: selectedFnTypeIds,
        isFixed: formData.isFixed,
        fixedPayment: formData.fixedPayment
          ? parseInt(formData.fixedPayment)
          : 0,
        isHourly: formData.isHourly,
        hourlyPayment: formData.hourlyPayment
          ? parseInt(formData.hourlyPayment)
          : 0,
        isPerDevice: formData.isPerDevice,
        perDevicePayment: formData.perDevicePayment
          ? parseInt(formData.perDevicePayment)
          : 0,
        isBlended: formData.isBlended,
        firstHourlyPayment: formData.firstHourlyPayment
          ? parseInt(formData.firstHourlyPayment)
          : 0,
        additionalHourlyPayment: formData.additionalHourlyPayment
          ? parseInt(formData.additionalHourlyPayment)
          : 0,
        isEnabledCounterOffer: formData.isEnabledCounterOffer,
        offDays: formData.offDays,
        timeOffStartAt: formData.timeOffStartAt,
        timeOffEndAt: formData.timeOffEndAt,
        timeZone: formData.timeZone,
        scheduleChangeNote: formData.scheduleChangeNote,
        paymentChangeNote: formData.paymentChangeNote,
        scheduleAndPayChangeNote: formData.scheduleAndPayChangeNote,
      };

      if (cron.cronId) {
        // Call the mutation function
        const response = await updateCron(data).unwrap();
        toast.success('Cron updated successfully');
      } else {
        const response = await addCron(data).unwrap();
        // Handle success (e.g., show a toast message or refresh the data)
        toast.success('Cron added successfully');
      }
      // Close the modal
      // setShowEditModal(false);
      window.location.reload();

      // Handle success (e.g., show a toast message or refresh the data)
      toast.success('Cron updated successfully!');
    } catch (error) {
      // Handle error (e.g., show an error message)
      toast.error('Failed to update cron.');
    }
  };

  // console.log('cron config modal');

  const steps = [
    {
      title: 'Step 1: Cron Configuration',
      content: (
        <>
          {userInfo.isAdmin && !cron.cronId && (
            <Row style={{ marginBottom: '20px' }}>
              <Col>
                <BootstrapForm.Group controlId="providerName">
                  <BootstrapForm.Label>Provider</BootstrapForm.Label>
                  <Select
                    value={formData.user}
                    name="userId"
                    options={allActiveProvidersOptions}
                    onChange={(selectedOption) =>
                      handleProviderChange(selectedOption)
                    }
                    classNamePrefix="select"
                    required
                  />
                </BootstrapForm.Group>
              </Col>
            </Row>
          )}
          <Row style={{ marginBottom: '20px' }}>
            <Col>
              <BootstrapForm.Group controlId="cronStartAt">
                <BootstrapForm.Label>Cron Start At</BootstrapForm.Label>
                <BootstrapForm.Control
                  type="datetime-local"
                  name="cronStartAt"
                  value={formatDateForInput(formData.cronStartAt)}
                  onChange={handleChange}
                />
              </BootstrapForm.Group>
            </Col>
            <Col>
              <BootstrapForm.Group controlId="cronEndAt">
                <BootstrapForm.Label>Cron End At</BootstrapForm.Label>
                <BootstrapForm.Control
                  type="datetime-local"
                  name="cronEndAt"
                  value={formatDateForInput(formData.cronEndAt)}
                  onChange={handleChange}
                />
              </BootstrapForm.Group>
            </Col>
          </Row>

          <Row style={{ marginBottom: '20px' }}>
            <Col>
              <BootstrapForm.Group controlId="centerZip">
                <BootstrapForm.Label>Center Zip</BootstrapForm.Label>
                <BootstrapForm.Control
                  type="text"
                  name="centerZip"
                  value={formData.centerZip || ''}
                  onChange={handleChange}
                />
              </BootstrapForm.Group>
            </Col>
            <Col>
              <BootstrapForm.Group controlId="drivingRadius">
                <BootstrapForm.Label>Driving Radius</BootstrapForm.Label>
                <BootstrapForm.Control
                  type="number"
                  name="drivingRadius"
                  value={formData.drivingRadius || ''}
                  onChange={handleChange}
                />
              </BootstrapForm.Group>
            </Col>
          </Row>

          <BootstrapForm.Group controlId="workOrderTypes">
            <BootstrapForm.Label>Types of Work Order</BootstrapForm.Label>
            <Select
              value={workOrderTypeOptions}
              isMulti
              name="types_of_work_order"
              options={allWorkOrderTypeOptions}
              onChange={(selectedOptions) =>
                handleWorkOrderTypeChange(selectedOptions)
              }
              className="basic-multi-select"
              classNamePrefix="select"
            />
          </BootstrapForm.Group>
        </>
      ),
    },
    {
      title: 'Step 2: Payment Details',
      content: (
        <>
          <div style={{ marginTop: '20px' }}>
            <h5>Payments</h5>
          </div>

          <Row style={{ marginBottom: '10px' }}>
            <Col>
              <BootstrapForm.Group controlId="fixedPayment">
                <BootstrapForm.Check
                  type="checkbox"
                  label="Fixed"
                  checked={formData.isFixed}
                  onChange={(e) =>
                    setFormData({ ...formData, isFixed: e.target.checked })
                  }
                />
                {formData.isFixed && (
                  <div style={{ marginTop: '10px' }}>
                    <BootstrapForm.Control
                      type="number"
                      placeholder="Total payment"
                      value={formData.fixedPayment || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fixedPayment: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
              </BootstrapForm.Group>
            </Col>

            <Col>
              <BootstrapForm.Group controlId="hourlyPayment">
                <BootstrapForm.Check
                  type="checkbox"
                  label="Hourly"
                  checked={formData.isHourly}
                  onChange={(e) =>
                    setFormData({ ...formData, isHourly: e.target.checked })
                  }
                />
                {formData.isHourly && (
                  <div style={{ marginTop: '10px' }}>
                    <BootstrapForm.Control
                      type="number"
                      placeholder="Hourly payment"
                      value={formData.hourlyPayment || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          hourlyPayment: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
              </BootstrapForm.Group>
            </Col>
          </Row>

          <Row style={{ marginBottom: '20px' }}>
            <Col>
              <BootstrapForm.Group controlId="perDevicePayment">
                <BootstrapForm.Check
                  type="checkbox"
                  label="Per Device"
                  checked={formData.isPerDevice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      isPerDevice: e.target.checked,
                    })
                  }
                />
                {formData.isPerDevice && (
                  <div style={{ marginTop: '10px' }}>
                    <BootstrapForm.Control
                      type="number"
                      placeholder="Per device payment"
                      value={formData.perDevicePayment || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          perDevicePayment: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
              </BootstrapForm.Group>
            </Col>

            <Col>
              <BootstrapForm.Group controlId="blendedPayment">
                <BootstrapForm.Check
                  type="checkbox"
                  label="Blended"
                  checked={formData.isBlended}
                  onChange={(e) =>
                    setFormData({ ...formData, isBlended: e.target.checked })
                  }
                />
                {formData.isBlended && (
                  <>
                    <div style={{ marginTop: '10px' }}>
                      <BootstrapForm.Control
                        type="number"
                        placeholder="Fixed hourly payment"
                        value={formData.firstHourlyPayment || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            firstHourlyPayment: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <BootstrapForm.Control
                        type="number"
                        placeholder="Additional hourly payment"
                        value={formData.additionalHourlyPayment || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            additionalHourlyPayment: e.target.value,
                          })
                        }
                      />
                    </div>
                  </>
                )}
              </BootstrapForm.Group>
            </Col>
          </Row>
        </>
      ),
    },
    {
      title: 'Step 3: Schedule',
      content: (
        <>
          <div style={{ marginTop: '20px' }}>
            <h5>Schedule</h5>
          </div>
          <Row style={{ marginBottom: '20px' }}>
            <Col>
              <TimeZoneSelect
                onChange={(value) =>
                  setFormData({ ...formData, timeZone: value })
                }
                selectedTimeZone={formData.timeZone}
              />
            </Col>
          </Row>
          <Row style={{ marginBottom: '20px' }}>
            <Col>
              <BootstrapForm.Group controlId="workingWindowStartAt">
                <BootstrapForm.Label>Daily Start At</BootstrapForm.Label>
                <BootstrapForm.Control
                  type="time"
                  name="workingWindowStartAt"
                  value={formData.workingWindowStartAt}
                  onChange={handleChange}
                />
              </BootstrapForm.Group>
            </Col>
            <Col>
              <BootstrapForm.Group controlId="workingWindowEndAt">
                <BootstrapForm.Label>Daily End At</BootstrapForm.Label>
                <BootstrapForm.Control
                  type="time"
                  name="workingWindowEndAt"
                  value={formData.workingWindowEndAt}
                  onChange={handleChange}
                />
              </BootstrapForm.Group>
            </Col>
          </Row>

          <div>
            <h6>Off Days</h6>
          </div>
          <Row style={{ marginBottom: '20px' }}>
            <Col>
              <BootstrapForm.Group controlId="offDays">
                <Row style={{ marginBottom: '20px' }}>
                  {[
                    'Monday',
                    'Tuesday',
                    'Wednesday',
                    'Thursday',
                    'Friday',
                    'Saturday',
                    'Sunday',
                  ].map((day) => (
                    <Col sm={4} key={day}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          value={day}
                          checked={
                            formData.offDays && formData.offDays.includes(day)
                          }
                          onChange={handleOffDayChange}
                          id={`offDayCheckbox-${day}`} // Unique id for each checkbox
                        />
                        <label
                          htmlFor={`offDayCheckbox-${day}`}
                          style={{ marginLeft: '8px' }}
                        >
                          {day}
                        </label>
                      </div>
                    </Col>
                  ))}
                </Row>
              </BootstrapForm.Group>
            </Col>
          </Row>

          <div>
            <h6>Planned Time-Off</h6>
          </div>
          <Row style={{ marginBottom: '20px' }}>
            <Col md={6}>
              <BootstrapForm.Group controlId="timeOffStartAt">
                <BootstrapForm.Label>Start Date-Time</BootstrapForm.Label>
                <BootstrapForm.Control
                  type="datetime-local"
                  name="timeOffStartAt"
                  value={formatDateForInput(formData.timeOffStartAt)}
                  onChange={handleChange}
                />
              </BootstrapForm.Group>
            </Col>
            <Col md={6}>
              <BootstrapForm.Group controlId="timeOffEndAt">
                <BootstrapForm.Label>End Date-Time</BootstrapForm.Label>
                <BootstrapForm.Control
                  type="datetime-local"
                  name="timeOffEndAt"
                  value={formatDateForInput(formData.timeOffEndAt)}
                  onChange={handleChange}
                />
              </BootstrapForm.Group>
            </Col>
          </Row>
        </>
      ),
    },
    {
      title: 'Step 4: Counter Offer',
      content: (
        <>
          <Row style={{ marginBottom: '20px' }}>
            <Col>
              <BootstrapForm.Group controlId="counterOffer">
                <BootstrapForm.Check
                  type="checkbox"
                  label="Counter Offer"
                  checked={formData.isEnabledCounterOffer}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      isEnabledCounterOffer: e.target.checked,
                    })
                  }
                />

                <div style={{ marginTop: '10px' }}>
                  <Alert variant="info">
                    If counter offer is enabled, the cron will counter-offer
                    work orders that don't meet the configured payment and
                    schedule conditions.
                  </Alert>
                </div>
              </BootstrapForm.Group>
            </Col>
          </Row>

          {formData.isEnabledCounterOffer && (
            <Row style={{ marginBottom: '20px' }}>
              <Col md={6}>
                <BootstrapForm.Group controlId="paymentChangeNote">
                  <BootstrapForm.Label>Payment Change Note</BootstrapForm.Label>
                  <BootstrapForm.Control
                    as="textarea"
                    name="paymentChangeNote"
                    value={formData.paymentChangeNote || ''}
                    onChange={handleChange}
                    rows={3}
                  />
                </BootstrapForm.Group>
              </Col>
              <Col md={6}>
                <BootstrapForm.Group controlId="scheduleChangeNote">
                  <BootstrapForm.Label>
                    Schedule Change Note
                  </BootstrapForm.Label>
                  <BootstrapForm.Control
                    as="textarea"
                    name="scheduleChangeNote"
                    value={formData.scheduleChangeNote || ''}
                    onChange={handleChange}
                    rows={3}
                  />
                </BootstrapForm.Group>
              </Col>
              <Col md={12} className="mt-3">
                <BootstrapForm.Group controlId="scheduleAndPayChangeNote">
                  <BootstrapForm.Label>
                    Schedule & Payment Change Note
                  </BootstrapForm.Label>
                  <BootstrapForm.Control
                    as="textarea"
                    name="scheduleAndPayChangeNote"
                    value={formData.scheduleAndPayChangeNote || ''}
                    onChange={handleChange}
                    rows={3}
                  />
                </BootstrapForm.Group>
              </Col>
              <div style={{ marginTop: '10px' }}>
                <Alert variant="info">
                  Please use generic notes for changes (payment, schedule, or
                  both) that clearly convey the reason for the adjustment to the
                  buyer, such as: "Due to unforeseen circumstances, we have
                  updated the payment & schedule to ensure timely processing."
                </Alert>
              </div>
            </Row>
          )}
        </>
      ),
    },
    {
      title: 'Step 5: Review & Save',
      content: (
        <>
          <div style={{ marginTop: '20px' }}>
            <h5>Review Your Details</h5>
            <p>Please review your cron details before saving:</p>
            {/* You can render the current values of formData here for review */}
            <pre>{JSON.stringify(formData, null, 2)}</pre>
          </div>
          <Row style={{ marginBottom: '20px' }}>
            <Col>
              <BootstrapForm.Group controlId="status">
                <BootstrapForm.Label>Status</BootstrapForm.Label>
                <BootstrapForm.Control
                  as="select"
                  name="status"
                  value={formData.status || ''}
                  onChange={handleChange}
                >
                  <option value="" disabled>
                    Select Status
                  </option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </BootstrapForm.Control>
              </BootstrapForm.Group>
            </Col>
          </Row>
        </>
      ),
    },
  ];

  const handleNext = () => {
    setCurrentStep((prevStep) => Math.min(prevStep + 1, steps.length - 1));
  };

  const handleBack = () => {
    setCurrentStep((prevStep) => Math.max(prevStep - 1, 0));
  };

  const handleClose = () => setShowEditModal(false);

  return (
    <Modal size="lg" show={showEditModal} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>{steps[currentStep].title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <BootstrapForm>{steps[currentStep].content}</BootstrapForm>
      </Modal.Body>
      <Modal.Footer>
        {currentStep > 0 && (
          <Button variant="primary" onClick={handleBack}>
            Previous
          </Button>
        )}
        {currentStep < steps.length - 1 ? (
          <Button variant="primary" onClick={handleNext}>
            Next
          </Button>
        ) : (
          <Button variant="success" onClick={handleSaveChanges}>
            Save Changes
          </Button>
        )}
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CronConfigModal;
