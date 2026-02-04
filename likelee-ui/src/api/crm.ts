import { base44 as base44Client } from "./base44Client";
export { base44Client };

export const listClients = () => base44Client.get("/api/agency/clients");

export const createClient = (data: any) =>
  base44Client.post("/api/agency/clients", data);

export const updateClient = (id: string, data: any) =>
  base44Client.post(`/api/agency/clients/${id}`, data);

export const deleteClient = (id: string) =>
  base44Client.delete(`/api/agency/clients/${id}`);

export const listContacts = (clientId: string) =>
  base44Client.get(`/api/agency/clients/${clientId}/contacts`);

export const createContact = (clientId: string, data: any) =>
  base44Client.post(`/api/agency/clients/${clientId}/contacts`, data);

export const deleteContact = (clientId: string, contactId: string) =>
  base44Client.delete(`/api/agency/clients/${clientId}/contacts/${contactId}`);

export const listCommunications = (clientId: string) =>
  base44Client.get(`/api/agency/clients/${clientId}/communications`);

export const createCommunication = (clientId: string, data: any) =>
  base44Client.post(`/api/agency/clients/${clientId}/communications`, data);

export const listFiles = (clientId: string) =>
  base44Client.get(`/api/agency/clients/${clientId}/files`);

export const uploadFile = (clientId: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return base44Client.post(`/api/agency/clients/${clientId}/files`, formData);
};

export const getSignedUrl = (clientId: string, fileId: string) =>
  base44Client.get(
    `/api/agency/clients/${clientId}/files/${fileId}/signed-url`,
  );
