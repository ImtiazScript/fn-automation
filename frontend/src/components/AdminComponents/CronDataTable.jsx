import { useState } from "react";
import { Button, Modal, Table, Form as BootstrapForm } from "react-bootstrap";
import { toast } from "react-toastify";
import { useBlockUserMutation, useUnblockUserMutation, useUpdateUserByAdminMutation } from "../../slices/adminApiSlice";
import { format } from 'date-fns';

const CronsDataTable = ({ crons }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const [showBlockingConfirmation, setShowBlockingConfirmation] = useState(false); // State for the blocking confirmation dialog
  const [showUnblockingConfirmation, setShowUnblockingConfirmation] = useState(false); // State for the unblocking confirmation dialog

  const [userIdToDelete, setUserIdToDelete] = useState(null); // Track the user ID to delete
  const [userIdToBlock, setUserIdToBlock] = useState(null); // Track the user ID to block
  const [userIdToUnblock, setUserIdToUnblock] = useState(null); // Track the user ID to unblock

  const [showUpdateModal, setShowUpdateModal] = useState(false); // State for the update modal
  const [userIdToUpdate, setUserIdToUpdate] = useState("");
  const [userNameToUpdate, setUserNameToUpdate] = useState("");
  const [userEmailToUpdate, setUserEmailToUpdate] = useState("");

  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
  };

  // const filteredCrons = crons;
  const filteredCrons = crons.filter(
    (cron) =>
      cron.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [blockUser, { isBlockingLoading }] = useBlockUserMutation();
  const [unblockUser, { isUnblockingLoading }] = useUnblockUserMutation();
  const [updateUserByAdmin, { isLoading: isUpdating }] = useUpdateUserByAdminMutation();


  const handleBlock = async () => {
    try {
      const responseFromApiCall = await blockUser({ userId: userIdToBlock });
      toast.success("User Blocked Successfully.");
      setUserIdToBlock(null); // Clear the user ID to block
      setShowBlockingConfirmation(false); // Close the blocking confirmation dialog
      window.location.reload();

    } catch (err) {
      toast.error(err?.data?.errors[0]?.message || err?.error);
    }
  };

  const handleUnblock = async () => {
    try {
      const responseFromApiCall = await unblockUser({ userId: userIdToUnblock });
      toast.success("User Unblocked Successfully.");
      setUserIdToUnblock(null); // Clear the user ID to unblock
      setShowUnblockingConfirmation(false); // Close the unblocking confirmation dialog
      window.location.reload();

    } catch (err) {
      toast.error(err?.data?.errors[0]?.message || err?.error);
    }
  };

  const handleOpenUpdateModal = (user) => {
    setUserIdToUpdate(user._id)
    setUserNameToUpdate(user.name);
    setUserEmailToUpdate(user.email);
    setShowUpdateModal(true);
  };

  const handleUpdate = async () => {
    try {
      const responseFromApiCall = await updateUserByAdmin({
        userId: userIdToUpdate,
        name: userNameToUpdate,
        email: userEmailToUpdate
      });
      toast.success("User Updated Successfully.");
      setUserIdToUpdate(null); // Clear the user ID to update
      setShowUpdateModal(false); // Close the update modal

      // Reload the page to reflect the updated data
      window.location.reload();
      
    } catch (err) {
      toast.error(err?.data?.errors[0]?.message || err?.error);
    }
  };

  return (
    <>
        <BootstrapForm>
          <BootstrapForm.Group
            className="mt-3"
            controlId="exampleForm.ControlInput1"
          >
            <BootstrapForm.Control
              style={{ width: "500px" }}
              value={searchQuery}
              type="text"
              placeholder="Search: Enter Provider Name........"
              onChange={handleSearch}
            />
          </BootstrapForm.Group>
        </BootstrapForm>
      <div style={{ marginTop: "20px" }}>
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Cron Id</th>
              <th>Provider Name</th>
              <th>Cron Start At</th>
              <th>Cron End At</th>
              <th>Work Start</th>
              <th>Work End</th>
              <th>Driving Radius</th>
              <th>Status</th>
              <th>#WO Requested</th>
            </tr>
          </thead>
          <tbody>
            {filteredCrons.map((cron, index) => (
              <tr key={index}>
                <td>{cron.cronId}</td>
                <td>{cron.name}</td>
                <td>
                {format(new Date(cron.cronStartAt), 'yyyy-MM-dd hh:mm a')}
              </td>
              <td>
                {format(new Date(cron.cronEndAt), 'yyyy-MM-dd hh:mm a')}
              </td>
              <td>
                {format(new Date(cron.workingWindowStartAt), 'yyyy-MM-dd hh:mm a')}
              </td>
              <td>
                {format(new Date(cron.workingWindowEndAt), 'yyyy-MM-dd hh:mm a')}
              </td>
              <td>
                {cron.drivingRadius}
              </td>
              <td>
                {cron.status}
              </td>
              <td>
                {cron.totalRequested}
              </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Update User Modal */}
      <Modal show={showUpdateModal} onHide={() => setShowUpdateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Update User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <BootstrapForm>
            <BootstrapForm.Group controlId="name">
              <BootstrapForm.Label>Name</BootstrapForm.Label>
              <BootstrapForm.Control
                type="text"
                value={userNameToUpdate}
                onChange={(e) => setUserNameToUpdate(e.target.value)}
              />
            </BootstrapForm.Group>
            <BootstrapForm.Group controlId="email">
              <BootstrapForm.Label>Email</BootstrapForm.Label>
              <BootstrapForm.Control
                type="email"
                value={userEmailToUpdate}
                onChange={(e) => setUserEmailToUpdate(e.target.value)}
              />
            </BootstrapForm.Group>
          </BootstrapForm>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUpdateModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleUpdate}
            disabled={isUpdating}
          >
            {isUpdating ? "Updating..." : "Update"}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default CronsDataTable;
