class SuppliesApiService {
  async getAcceptanceMeta(baseApiUrl, token, options) {
    const params = new URLSearchParams({
      warehouseIDs: options.warehouseIDs.join(','),
    });
    const response = await fetch(`${baseApiUrl}/acceptance/coefficients?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    return result;
  }

  async getWarehousesMeta(baseApiUrl, token) {
    const response = await fetch(`${baseApiUrl}/warehouses`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    return result;
  }
}

export default SuppliesApiService;