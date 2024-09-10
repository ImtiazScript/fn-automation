import { useState, useEffect } from 'react';
import { Button, Modal, Table, Row, Col, Form as BootstrapForm } from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
  useBlockUserMutation,
  useUnblockUserMutation,
  useUpdateUserByAdminMutation,
  useActivateUserMutation,
  useDeleteUserMutation,
  useGetUsersDataMutation,
} from '../../slices/adminApiSlice';
import { PROFILE_IMAGE_DIR_PATH, PROFILE_PLACEHOLDER_IMAGE_NAME } from '../../utils/constants';

const UsersDataTable = () => {
  const [users, setUsers] = useState([]);
  const [usersDataFromAPI, { isUsersDataLoading }] = useGetUsersDataMutation();
  const [totalUsers, setTotalUsers] = useState(0);
  const limit = 10;
  const totalPages = Math.ceil(totalUsers / limit);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    try {
      const fetchData = async () => {
        const responseFromApiCall = await usersDataFromAPI({ currentPage });
        const usersArray = responseFromApiCall.data.usersData;
        const totalUsers = responseFromApiCall.data.totalUsers;
        setUsers(usersArray);
        setTotalUsers(totalUsers);
      };
      fetchData();
    } catch (err) {
      toast.error(err?.data?.errors[0]?.message || err);
      console.error('Error fetching users:', err);
    }
  }, [currentPage]);

  const [searchQuery, setSearchQuery] = useState('');
  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
  };

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [userIdToDelete, setUserIdToDelete] = useState(null); // Track the user ID to delete
  const [deleteUser, { isDeleteLoading }] = useDeleteUserMutation();
  const handleDelete = async () => {
    try {
      const responseFromApiCall = await deleteUser({ userId: userIdToDelete });
      toast.success('User Deleted Successfully.');
      setUserIdToDelete(null);
      setShowDeleteConfirmation(false);
      window.location.reload();
    } catch (err) {
      toast.error(err?.data?.errors[0]?.message || err?.error);
    }
  };

  const [showBlockingConfirmation, setShowBlockingConfirmation] = useState(false);
  const [userIdToBlock, setUserIdToBlock] = useState(null); // Track the user ID to block
  const [blockUser, { isBlockingLoading }] = useBlockUserMutation();
  const handleBlock = async () => {
    try {
      const responseFromApiCall = await blockUser({ userId: userIdToBlock });
      toast.success('User Blocked Successfully.');
      setUserIdToBlock(null); // Clear the user ID to block
      setShowBlockingConfirmation(false); // Close the blocking confirmation dialog
      window.location.reload();
    } catch (err) {
      toast.error(err?.data?.errors[0]?.message || err?.error);
    }
  };

  const [showUnblockingConfirmation, setShowUnblockingConfirmation] = useState(false);
  const [userIdToUnblock, setUserIdToUnblock] = useState(null); // Track the user ID to unblock
  const [unblockUser, { isUnblockingLoading }] = useUnblockUserMutation();
  const handleUnblock = async () => {
    try {
      const responseFromApiCall = await unblockUser({
        userId: userIdToUnblock,
      });
      toast.success('User Unblocked Successfully.');
      setUserIdToUnblock(null); // Clear the user ID to unblock
      setShowUnblockingConfirmation(false); // Close the unblocking confirmation dialog
      window.location.reload();
    } catch (err) {
      toast.error(err?.data?.errors[0]?.message || err?.error);
    }
  };

  const [showUpdateModal, setShowUpdateModal] = useState(false); // State for the update modal
  const [userIdToUpdate, setUserIdToUpdate] = useState('');
  const [userNameToUpdate, setUserNameToUpdate] = useState('');
  const [userEmailToUpdate, setUserEmailToUpdate] = useState('');

  const [userIdToActivate, setUserIdToActivate] = useState(null);
  const [showActivateConfirmation, setShowActivateConfirmation] = useState(false);
  const [activateUser, { isActivateLoading }] = useActivateUserMutation();
  const handleActivateUser = async () => {
    try {
      const responseFromApiCall = await activateUser({ userId: userIdToActivate });
      toast.success('User Activated Successfully.');
      setUserIdToActivate(null);
      setShowActivateConfirmation(false);
      window.location.reload();
    } catch (err) {
      toast.error(err?.data?.errors[0]?.message || err?.error);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const [updateUserByAdmin, { isLoading: isUpdating }] = useUpdateUserByAdminMutation();
  const handleOpenUpdateModal = (user) => {
    setUserIdToUpdate(user._id);
    setUserNameToUpdate(user.name);
    setUserEmailToUpdate(user.email);
    setShowUpdateModal(true);
  };
  const handleUpdate = async () => {
    try {
      const responseFromApiCall = await updateUserByAdmin({
        userId: userIdToUpdate,
        name: userNameToUpdate,
        email: userEmailToUpdate,
      });
      toast.success('User Updated Successfully.');
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
      <BootstrapForm className="mb-4"> {/* Add margin-bottom */}
        <div className="row mt-3 align-items-center">
          <div className="col-auto">
            <BootstrapForm.Label>Search users:</BootstrapForm.Label>
          </div>
          <div className="col">
            <BootstrapForm.Control
              style={{ width: '100%' }}
              value={searchQuery}
              type="text"
              placeholder="Enter Name or email..."
              onChange={handleSearch}
            />
          </div>
        </div>
      </BootstrapForm>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th className="text-center align-middle">#ID</th>
            <th className="text-center align-middle">Name</th>
            <th className="text-center align-middle d-none d-md-table-cell">
              Email
            </th>
            <th className="text-center align-middle">Update</th>
            <th className="text-center align-middle">Block</th>
            <th className="text-center align-middle">Delete</th>
            <th className="text-center align-middle">Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map((user, index) => (
            <tr key={index}>
              <td className="text-center align-middle">
                {user.userId}
              </td>
              <td>
                <div style={{ textAlign: 'center' }}>
                  <img
                    src={
                      user.profileImageName
                        ? PROFILE_IMAGE_DIR_PATH + user.profileImageName
                        : PROFILE_IMAGE_DIR_PATH +
                          PROFILE_PLACEHOLDER_IMAGE_NAME
                    }
                    alt={user.name}
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      marginBottom: '2px', // Space between image and name
                      border: user.isAdmin ? '3px solid #FFD700' : 'none',
                    }}
                  />
                  <div
                    style={{
                      fontSize: '9px',
                      color: user.isAdmin ? '#FFD700' : '#555', // Gold color for admin, gray for provider
                      fontWeight: 'bold',
                    }}
                  >
                    {user.isAdmin ? 'Admin' : 'Provider'}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                    {user.name}
                  </div>
                </div>
              </td>
              <td className="text-center align-middle d-none d-md-table-cell">
                {user.email}
              </td>
              <td className="text-center align-middle">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="mt-3"
                  onClick={() => handleOpenUpdateModal(user)}
                >
                  Update
                </Button>
              </td>
              <td className="text-center align-middle">
                <Button
                  type="button"
                  variant={user.blocked ? 'success' : 'danger'}
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    if (user.blocked) {
                      setUserIdToUnblock(user._id);
                      setShowUnblockingConfirmation(true);
                    } else {
                      setUserIdToBlock(user._id);
                      setShowBlockingConfirmation(true);
                    }
                  }}
                >
                  {user.blocked ? 'Unblock' : 'Block'}
                </Button>
              </td>
              <td className="text-center align-middle">
                <Button
                  type="button"
                  variant={'danger'}
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                      setUserIdToDelete(user._id);
                      setShowDeleteConfirmation(true);
                  }}
                >
                  Delete
                </Button>
              </td>
              <td className="text-center align-middle">
                <Button
                  type="button"
                  variant={user.isActive ? 'success' : 'danger'}
                  size="sm"
                  className="mt-3"
                  disabled={user.isActive}
                  onClick={() => {
                    setUserIdToActivate(user._id);
                    setShowActivateConfirmation(true);
                  }}
                >
                  {user.isActive ? 'Active' : 'Activate'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Row className="mt-4">
        <Col className="text-center">
          <Button
            variant="secondary"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="mx-2">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="secondary"
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </Col>
      </Row>

      {/* Blocking Confirmation Dialog */}
      <Modal
        show={showBlockingConfirmation}
        onHide={() => setShowBlockingConfirmation(false)}
        className="custom-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Block</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to block this user?</Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowBlockingConfirmation(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleBlock}
            disabled={isBlockingLoading}
          >
            {isBlockingLoading ? 'Blocking...' : 'Block'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Activating Confirmation Dialog */}
      <Modal
        show={showActivateConfirmation}
        onHide={() => setShowActivateConfirmation(false)}
        className="custom-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Activate</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to activate this user?</Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowActivateConfirmation(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleActivateUser}
            disabled={isActivateLoading}
          >
            {isActivateLoading ? 'Activating...' : 'Activate'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Un Blocking Confirmation Dialog */}
      <Modal
        show={showUnblockingConfirmation}
        onHide={() => setShowUnblockingConfirmation(false)}
        className="custom-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Un-Block</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to Un-Block this user?</Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowUnblockingConfirmation(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleUnblock}
            disabled={isUnblockingLoading}
          >
            {isBlockingLoading ? 'Un-Blocking...' : 'Un-Block'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Modal
        show={showDeleteConfirmation}
        onHide={() => setShowDeleteConfirmation(false)}
        className="custom-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to delete this user?</Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowDeleteConfirmation(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={isDeleteLoading}
          >
            {isDeleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Update User Modal */}
      <Modal
        show={showUpdateModal}
        onHide={() => setShowUpdateModal(false)}
        className="custom-modal"
      >
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
            {isUpdating ? 'Updating...' : 'Update'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default UsersDataTable;
