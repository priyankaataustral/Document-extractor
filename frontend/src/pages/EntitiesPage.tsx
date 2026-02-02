import { useState, useEffect, useCallback } from "react";
import {
  getEntities,
  deleteEntity,
  ExtractedEntity,
} from "../services/api";

/**
 * Entities Page Component
 *
 * Lists all extracted entities with search and pagination.
 */
function EntitiesPage() {
  const [entities, setEntities] = useState<ExtractedEntity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<ExtractedEntity | null>(
    null
  );

  const limit = 25;

  // Fetch entities
  const fetchEntities = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getEntities(page, limit, search || undefined);
      if (response.success && response.data) {
        setEntities(response.data.entities);
        setTotal(response.data.total);
      }
    } catch (error) {
      console.error("Failed to fetch entities:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page on search
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entity?")) return;

    try {
      const response = await deleteEntity(id);
      if (response.success) {
        fetchEntities();
      } else {
        alert("Failed to delete: " + response.error);
      }
    } catch (error) {
      alert("Failed to delete entity");
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Truncate text
  const truncate = (text: string | null, length: number = 30) => {
    if (!text) return "-";
    return text.length > length ? text.slice(0, length) + "..." : text;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="card">
        <h2>Extracted Records ({total})</h2>

        {/* Search */}
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name, email, or organisation..."
            value={search}
            onChange={handleSearch}
          />
        </div>

        {/* Table */}
        <div className="table-container">
          {loading ? (
            <div className="table-empty">
              <span className="spinner" /> Loading...
            </div>
          ) : entities.length === 0 ? (
            <div className="table-empty">
              {search
                ? "No matching records found"
                : "No records yet. Upload documents to extract entities."}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Organisation</th>
                  <th>Role</th>
                  <th>Source</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entities.map((entity) => (
                  <tr key={entity.id}>
                    <td>{truncate(entity.full_name)}</td>
                    <td>{truncate(entity.email, 25)}</td>
                    <td>{truncate(entity.phone_number, 15)}</td>
                    <td>{truncate(entity.organisation, 20)}</td>
                    <td>{truncate(entity.role_title, 20)}</td>
                    <td>{truncate(entity.source_document_name, 20)}</td>
                    <td>{formatDate(entity.created_at)}</td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                        onClick={() => setSelectedEntity(entity)}
                      >
                        View
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{
                          padding: "0.25rem 0.5rem",
                          fontSize: "0.75rem",
                          marginLeft: "0.25rem",
                        }}
                        onClick={() => handleDelete(entity.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="btn btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              className="btn btn-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedEntity && (
        <div className="modal-overlay" onClick={() => setSelectedEntity(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Entity Details</h3>
              <button onClick={() => setSelectedEntity(null)}>&times;</button>
            </div>
            <div className="modal-content">
              <div className="entity-detail">
                <EntityField label="Full Name" value={selectedEntity.full_name} />
                <EntityField label="Email" value={selectedEntity.email} />
                <EntityField label="Phone" value={selectedEntity.phone_number} />
                <EntityField label="ID Number" value={selectedEntity.id_number} />
                <EntityField label="Address" value={selectedEntity.address} />
                <EntityField
                  label="Organisation"
                  value={selectedEntity.organisation}
                />
                <EntityField label="Role/Title" value={selectedEntity.role_title} />
                <EntityField label="Comments" value={selectedEntity.comments} />
                <EntityField
                  label="Source Document"
                  value={selectedEntity.source_document_name}
                />
                <EntityField
                  label="Extracted On"
                  value={formatDate(selectedEntity.created_at)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for displaying entity fields
function EntityField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="entity-field">
      <label>{label}</label>
      <span className={value ? "" : "empty"}>{value || "Not available"}</span>
    </div>
  );
}

export default EntitiesPage;
