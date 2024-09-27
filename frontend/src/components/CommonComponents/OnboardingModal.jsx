import React, { useState, useEffect } from 'react';
import { Modal, Button, Image } from 'react-bootstrap';
import { useSelector } from 'react-redux';

const OnboardingModal = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const { userContext } = useSelector((state) => state.userContext);
  const [show, setShow] = useState(false);
  const [remindMeLater, setRemindMeLater] = useState(false);
  const [allStepsCompleted, setAllStepsCompleted] = useState(false);

  // Check each step
  const isSignedup = userContext?.user;
  const isActivatedByAdmin = userContext?.user?.isActive;
  const isIntegrationComplete =
    userContext?.integration?.integrationStatus === 'Connected';
  const hasConfiguredCrons = userContext?.crons?.length > 0;

  // Step array with label, completion status, and link
  const steps = [
    { label: 'Signed up Successfully', completed: isSignedup }, // Always true since the user exists
    {
      label: 'Activated by admin',
      completed: isActivatedByAdmin,
      link: '/contact',
    },
    {
      label: 'Integration Completed with Field Nation',
      completed: isIntegrationComplete,
      link: '/connect-account',
    },
    {
      label: 'Configured Crons',
      completed: hasConfiguredCrons,
      link: '/crons/manage-crons',
    },
  ];

  // Check if all steps are completed
  useEffect(() => {
    const allCompleted = steps.every((step) => step.completed);
    setAllStepsCompleted(allCompleted);
  }, [steps]);

  // Handle "Remind me later" functionality
  const handleRemindMeLater = () => {
    localStorage.setItem('remindMeLater', Date.now());
    setRemindMeLater(true);
    setShow(false);
  };

  // Check if we should show the modal based on "Remind me later" logic
  useEffect(() => {
    const remindTime = localStorage.getItem('remindMeLater');
    if (remindTime) {
      const timeDiff = Date.now() - remindTime;
      if (timeDiff < 24 * 60 * 60 * 1000) {
        // 24 hours in milliseconds
        setRemindMeLater(true);
      }
    }
  }, []);

  // Show modal if not all steps completed and no "remind me later"
  useEffect(() => {
    if (!userInfo || userInfo.isAdmin || remindMeLater) {
      setShow(false);
    } else if (!remindMeLater && !allStepsCompleted) {
      setShow(true);
    }
  }, [remindMeLater, allStepsCompleted]);

  // Render completed steps with checkmarks and incomplete with links
  const renderSteps = () => {
    return steps.map((step, index) => (
        <div key={index}>
          <a 
            href={step.link || '#'} 
            className={`d-flex align-items-center mb-2 ${step.completed ? 'text-success' : ''}`}
            style={{ textDecoration: 'none' }}
          >
            <input 
              type="checkbox" 
              checked={step.completed} 
              readOnly 
              className="me-2"
            />
            <span>
              {step.label}
            </span>
          </a>
      
          {/* Conditionally render the message under 'Activated by Admin' */}
          {step.label === 'Activated by admin' && !step.completed && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '-7px', marginBottom: '5px' }}>
              <span>Wait for 24 hours, we already notified the admin about your login. They will get back to you within 24 hours.</span>
            </div>
          )}
        </div>
      ));
  };

  return (
    <Modal show={show} onHide={() => setShow(false)}>
      <Modal.Header closeButton>
        <Modal.Title>Welcome Onboard!</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {allStepsCompleted ? (
          <>
            <h5 className="text-success text-center">
              Congratulations! 🎉
              <br />
              You have completed all onboarding steps!
            </h5>
            <Image src="/onboarding.png" fluid />
          </>
        ) : (
          <>{renderSteps()}</>
        )}
      </Modal.Body>
      <Modal.Footer>
        {!allStepsCompleted && (
          <Button variant="primary" onClick={handleRemindMeLater}>
            Remind Me Later
          </Button>
        )}
        <Button variant="secondary" onClick={() => setShow(false)}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default OnboardingModal;
