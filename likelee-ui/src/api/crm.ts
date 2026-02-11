import { base44 as base44Client } from "./base44Client";
export { base44Client };

export const listClients = () => base44Client.get("/agency/clients");

export const createClient = (data: any) =>
  base44Client.post("/agency/clients", data);

export const updateClient = (id: string, data: any) =>
  base44Client.post(`/agency/clients/${id}`, data);

export const deleteClient = (id: string) =>
  base44Client.delete(`/agency/clients/${id}`);

export const listContacts = (clientId: string) =>
  base44Client.get(`/agency/clients/${clientId}/contacts`);

export const createContact = (clientId: string, data: any) =>
  base44Client.post(`/agency/clients/${clientId}/contacts`, data);

export const deleteContact = (clientId: string, contactId: string) =>
  base44Client.delete(`/agency/clients/${clientId}/contacts/${contactId}`);

export const listCommunications = (clientId: string) =>
  base44Client.get(`/agency/clients/${clientId}/communications`);

export const createCommunication = (clientId: string, data: any) =>
  base44Client.post(`/agency/clients/${clientId}/communications`, data);

export const listFiles = (clientId: string) =>
  base44Client.get(`/agency/clients/${clientId}/files`);

export const uploadFile = (clientId: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return base44Client.post(`/agency/clients/${clientId}/files`, formData);
};

export const getSignedUrl = (clientId: string, fileId: string) =>
  base44Client.get(
    `/agency/clients/${clientId}/files/${fileId}/signed-url`,
  );
