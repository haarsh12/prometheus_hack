import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_colors.dart';
import '../providers/calendar_provider.dart';
import '../models/farm_calendar_model.dart';

class AdvisoryCalendarScreen extends StatefulWidget {
  const AdvisoryCalendarScreen({super.key});

  @override
  State<AdvisoryCalendarScreen> createState() => _AdvisoryCalendarScreenState();
}

class _AdvisoryCalendarScreenState extends State<AdvisoryCalendarScreen> {
  String _selectedFilter = 'all';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FarmCalendarProvider>().fetchEvents();
    });
  }

  Color _kindColor(String kind) {
    switch (kind.toLowerCase()) {
      case 'treatment':
        return const Color(0xFF059669); // Green
      case 'check':
        return const Color(0xFF3B82F6); // Blue
      case 'weather':
        return const Color(0xFFF59E0B); // Amber
      case 'personal':
      default:
        return const Color(0xFF8B5CF6); // Purple
    }
  }

  IconData _kindIcon(String kind) {
    switch (kind.toLowerCase()) {
      case 'treatment':
        return Icons.healing_rounded;
      case 'check':
        return Icons.visibility_rounded;
      case 'weather':
        return Icons.cloud_outlined;
      case 'personal':
      default:
        return Icons.event_note_rounded;
    }
  }

  void _showAddEventDialog() {
    final titleController = TextEditingController();
    final detailController = TextEditingController();
    final cropController = TextEditingController();
    DateTime chosenDate = context.read<FarmCalendarProvider>().selectedDate;
    String chosenKind = 'treatment';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Add Farm Reminder',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: titleController,
                decoration: const InputDecoration(
                  labelText: 'Title / Task',
                  hintText: 'e.g. Bio-Fungicide Spray, Nitrogen top-dress',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: detailController,
                decoration: const InputDecoration(
                  labelText: 'Details (Optional)',
                  hintText: 'Quantity, dosage, field notes...',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: cropController,
                      decoration: const InputDecoration(
                        labelText: 'Crop',
                        hintText: 'Cotton, Wheat, etc.',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      isExpanded: true,
                      value: chosenKind,
                      decoration: const InputDecoration(
                        labelText: 'Kind',
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'treatment', child: Text('Treatment')),
                        DropdownMenuItem(value: 'check', child: Text('Inspection')),
                        DropdownMenuItem(value: 'weather', child: Text('Weather Task')),
                        DropdownMenuItem(value: 'personal', child: Text('Personal')),
                      ],
                      onChanged: (val) {
                        if (val != null) setModalState(() => chosenKind = val);
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.calendar_today, color: Color(0xFF059669)),
                title: Text(DateFormat('EEEE, d MMMM yyyy').format(chosenDate)),
                trailing: TextButton(
                  onPressed: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: chosenDate,
                      firstDate: DateTime.now().subtract(const Duration(days: 30)),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (picked != null) {
                      setModalState(() => chosenDate = picked);
                    }
                  },
                  child: const Text('Change Date'),
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () async {
                  if (titleController.text.trim().isEmpty) return;
                  await context.read<FarmCalendarProvider>().createEvent(
                    date: chosenDate,
                    title: titleController.text.trim(),
                    detail: detailController.text.trim().isNotEmpty ? detailController.text.trim() : null,
                    kind: chosenKind,
                    crop: cropController.text.trim().isNotEmpty ? cropController.text.trim() : null,
                  );
                  if (context.mounted) Navigator.pop(context);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.ink,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text('Save to Farm Calendar'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<FarmCalendarProvider>();
    final today = DateTime.now();

    // 14-day horizontal strip around today
    final days = List.generate(21, (i) => today.subtract(const Duration(days: 3)).add(Duration(days: i)));

    final filteredEvents = provider.events.where((e) {
      if (_selectedFilter == 'all') return true;
      return e.kind.toLowerCase() == _selectedFilter;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.calendar_month_rounded, color: Color(0xFF059669), size: 20),
            ),
            const SizedBox(width: 10),
            const Text(
              'Advisory Calender',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 19),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh events',
            onPressed: () => provider.fetchEvents(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddEventDialog,
        backgroundColor: AppColors.ink,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Add Task'),
      ),
      body: Column(
        children: [
          // Horizontal Date Selector
          Container(
            height: 84,
            padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: const BoxDecoration(
              color: AppColors.surface,
              border: Border(bottom: BorderSide(color: AppColors.border)),
            ),
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              itemCount: days.length,
              itemBuilder: (context, index) {
                final date = days[index];
                final isSelected = date.year == provider.selectedDate.year &&
                    date.month == provider.selectedDate.month &&
                    date.day == provider.selectedDate.day;
                final isToday = date.year == today.year &&
                    date.month == today.month &&
                    date.day == today.day;

                final hasEvents = provider.events.any((e) =>
                    e.eventDate.year == date.year &&
                    e.eventDate.month == date.month &&
                    e.eventDate.day == date.day);

                return GestureDetector(
                  onTap: () => provider.setSelectedDate(date),
                  child: Container(
                    width: 52,
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.ink : (isToday ? const Color(0xFFF0FDF4) : AppColors.surfaceAlt),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected
                            ? AppColors.ink
                            : (isToday ? const Color(0xFF10B981) : AppColors.border),
                        width: isToday ? 1.5 : 1,
                      ),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          DateFormat('E').format(date).substring(0, 2),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: isSelected ? Colors.white70 : AppColors.muted,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          date.day.toString(),
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: isSelected ? Colors.white : AppColors.ink,
                          ),
                        ),
                        if (hasEvents)
                          Container(
                            margin: const EdgeInsets.only(top: 2),
                            width: 5,
                            height: 5,
                            decoration: BoxDecoration(
                              color: isSelected ? const Color(0xFF10B981) : const Color(0xFF059669),
                              shape: BoxShape.circle,
                            ),
                          )
                        else
                          const SizedBox(height: 7),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // Kind Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                _filterChip('all', 'All Advisories'),
                const SizedBox(width: 8),
                _filterChip('treatment', 'Treatments'),
                const SizedBox(width: 8),
                _filterChip('check', 'Inspections'),
                const SizedBox(width: 8),
                _filterChip('weather', 'Weather Tasks'),
              ],
            ),
          ),

          // Events List
          Expanded(
            child: provider.isLoading
                ? const Center(child: CircularProgressIndicator())
                : filteredEvents.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.event_available, size: 52, color: AppColors.muted),
                            const SizedBox(height: 12),
                            const Text(
                              'No advisories for this selection',
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Tap + Add Task to set a field treatment or inspection.',
                              style: TextStyle(fontSize: 13, color: AppColors.muted),
                            ),
                            const SizedBox(height: 16),
                            OutlinedButton.icon(
                              onPressed: _showAddEventDialog,
                              icon: const Icon(Icons.add, size: 16),
                              label: const Text('Add Task'),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        itemCount: filteredEvents.length,
                        itemBuilder: (context, index) {
                          final event = filteredEvents[index];
                          final color = _kindColor(event.kind);
                          final icon = _kindIcon(event.kind);

                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: AppColors.border),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.03),
                                  blurRadius: 6,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: color.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(icon, color: color, size: 22),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: color.withValues(alpha: 0.12),
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: Text(
                                              event.kind.toUpperCase(),
                                              style: TextStyle(
                                                fontSize: 10,
                                                fontWeight: FontWeight.w700,
                                                color: color,
                                              ),
                                            ),
                                          ),
                                          Text(
                                            DateFormat('d MMM yyyy').format(event.eventDate),
                                            style: const TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w600,
                                              color: AppColors.muted,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        event.title,
                                        style: const TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.ink,
                                        ),
                                      ),
                                      if (event.detail != null && event.detail!.isNotEmpty) ...[
                                        const SizedBox(height: 3),
                                        Text(
                                          event.detail!,
                                          style: const TextStyle(fontSize: 13, color: AppColors.muted),
                                        ),
                                      ],
                                      if (event.crop != null && event.crop!.isNotEmpty) ...[
                                        const SizedBox(height: 6),
                                        Row(
                                          children: [
                                            const Icon(Icons.eco_outlined, size: 14, color: Color(0xFF059669)),
                                            const SizedBox(width: 4),
                                            Text(
                                              event.crop!,
                                              style: const TextStyle(
                                                fontSize: 12,
                                                fontWeight: FontWeight.w600,
                                                color: Color(0xFF059669),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _filterChip(String key, String label) {
    final isSelected = _selectedFilter == key;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => setState(() => _selectedFilter = key),
      selectedColor: AppColors.ink,
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : AppColors.textPrimary,
        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
        fontSize: 12,
      ),
    );
  }
}
