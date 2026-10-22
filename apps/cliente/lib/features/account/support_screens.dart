import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:volti_api/volti_api.dart';
import 'package:volti_flutter/volti_flutter.dart';

import '../../core/backend.dart';
import '../../core/errors.dart';
import '../../core/services.dart';
import '../../core/widgets.dart';
import 'account_common.dart';

/// `SupportMessageCreate.attachmentObjectKeys`: maxItems 4.
const kChatMaxAttachments = 4;

// ---------------------------------------------------------------------------
// Suporte (conversas)
// ---------------------------------------------------------------------------

final conversationsProvider =
    FutureProvider.autoDispose<List<SupportConversation>>((ref) => ref.watch(backendProvider).conversations());

class SupportScreen extends ConsumerWidget {
  const SupportScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    return VoltiScaffold(
      title: l.supportChat,
      bottom: VoltiButton(
        label: l.newConversation,
        icon: LucideIcons.plus,
        size: VoltiButtonSize.lg,
        fullWidth: true,
        onPressed: () async {
          final subject = TextEditingController();
          final message = TextEditingController();
          final ok = await VoltiDialog.show<bool>(
            context,
            title: l.newConversation,
            message: Column(mainAxisSize: MainAxisSize.min, children: [
              TextField(controller: subject, maxLength: 120, decoration: InputDecoration(labelText: l.subject)),
              const SizedBox(height: 8),
              TextField(controller: message, maxLines: 3, maxLength: 4000, decoration: InputDecoration(labelText: l.message)),
            ]),
            actions: [
              VoltiButton(label: l.send, fullWidth: true, onPressed: () => Navigator.of(context).pop(true)),
              VoltiButton(label: l.cancel, variant: VoltiButtonVariant.ghost, fullWidth: true, onPressed: () => Navigator.of(context).pop(false)),
            ],
          );
          final s = subject.text.trim(), m = message.text.trim();
          subject.dispose();
          message.dispose();
          if (ok != true || s.isEmpty || m.isEmpty) return;
          try {
            final c = await ref.read(backendProvider).openConversation(s, m);
            ref.invalidate(conversationsProvider);
            if (context.mounted) context.push('/account/support/${c.id}');
          } catch (e) {
            if (context.mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
          }
        },
      ),
      body: AsyncView<List<SupportConversation>>(
        value: ref.watch(conversationsProvider),
        onRetry: () => ref.invalidate(conversationsProvider),
        loading: (_) => accountListSkeleton(l.loading),
        data: (list) => list.isEmpty
            ? VoltiEmptyState(icon: LucideIcons.messageCircle, title: l.supportEmpty, message: l.supportEmptyText)
            : VoltiRefresh(
                onRefresh: () => ref.refresh(conversationsProvider.future),
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
                  children: VoltiStagger.wrap([
                    for (final c in list)
                      ListRow(
                        title: c.subject,
                        icon: LucideIcons.messageCircle,
                        iconTone: ListRowTone.brand,
                        subtitle: c.unreadCount != null && c.unreadCount! > 0 ? l.unreadMessages(c.unreadCount!) : null,
                        trailing: ListRowTrailing.chevron,
                        onTap: () => context.push('/account/support/${c.id}'),
                      ),
                  ]),
                ),
              ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Chat: hora da mensagem e anexos
// ---------------------------------------------------------------------------

final messagesProvider =
    FutureProvider.autoDispose.family<List<SupportMessage>, String>((ref, id) => ref.watch(backendProvider).messages(id));

class SupportChatScreen extends ConsumerStatefulWidget {
  const SupportChatScreen({super.key, required this.conversationId, this.pollInterval = const Duration(seconds: 6)});
  final String conversationId;
  final Duration pollInterval;
  @override
  ConsumerState<SupportChatScreen> createState() => _SupportChatScreenState();
}

class _SupportChatScreenState extends ConsumerState<SupportChatScreen> {
  final _ctrl = TextEditingController();
  Timer? _poll;
  final _attachments = <String>[];
  bool _uploading = false;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _poll = Timer.periodic(widget.pollInterval, (_) => ref.invalidate(messagesProvider(widget.conversationId)));
  }

  @override
  void dispose() {
    _poll?.cancel();
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _attach() async {
    final l = context.l;
    if (_attachments.length >= kChatMaxAttachments) return;
    final bytes = await ref.read(photoPickerProvider).take();
    if (bytes == null || !mounted) return;
    setState(() => _uploading = true);
    try {
      final backend = ref.read(backendProvider);
      final target = await backend.supportUpload(UploadContentType.imageSlashJpeg);
      await backend.upload(target, bytes, 'image/jpeg');
      if (mounted) setState(() => _attachments.add(target.objectKey));
    } catch (_) {
      if (mounted) VoltiToast.show(context, l.attachmentFailed, tone: VoltiToastTone.danger);
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _send() async {
    final l = context.l;
    var text = _ctrl.text.trim();
    if (text.isEmpty && _attachments.isEmpty) return;
    if (text.isEmpty) text = l.chatPhotoOnly;
    setState(() => _sending = true);
    try {
      await ref.read(backendProvider).sendMessage(widget.conversationId, text, attachmentKeys: List.of(_attachments));
      _ctrl.clear();
      setState(_attachments.clear);
      ref.invalidate(messagesProvider(widget.conversationId));
    } catch (e) {
      if (mounted) VoltiToast.show(context, failureText(l, e), tone: VoltiToastTone.danger);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    return VoltiScaffold(
      title: l.supportChat,
      bottom: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (_attachments.isNotEmpty || _uploading)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(children: [
              Icon(LucideIcons.paperclip, size: 16, color: scheme.onSurfaceVariant),
              const SizedBox(width: 6),
              Expanded(
                child: Semantics(
                  liveRegion: true,
                  child: Text(_uploading ? l.attachmentUploading : l.chatAttachments(_attachments.length), style: VoltiTypography.caption),
                ),
              ),
              if (_attachments.isNotEmpty)
                TextButton(onPressed: () => setState(_attachments.clear), child: Text(l.remove)),
            ]),
          ),
        Row(children: [
          VoltiIconButton(
            icon: LucideIcons.paperclip,
            variant: VoltiIconButtonVariant.soft,
            label: l.chatAttach,
            onPressed: _uploading || _attachments.length >= kChatMaxAttachments ? null : _attach,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: TextField(
              controller: _ctrl,
              maxLength: 4000,
              buildCounter: (_, {required currentLength, required isFocused, maxLength}) => null,
              decoration: InputDecoration(hintText: l.typeMessage),
              onSubmitted: (_) => _send(),
            ),
          ),
          const SizedBox(width: 8),
          VoltiIconButton(
            icon: LucideIcons.send,
            variant: VoltiIconButtonVariant.brand,
            label: l.send,
            onPressed: _sending || _uploading ? null : _send,
          ),
        ]),
      ]),
      body: AsyncView<List<SupportMessage>>(
        value: ref.watch(messagesProvider(widget.conversationId)),
        onRetry: () => ref.invalidate(messagesProvider(widget.conversationId)),
        data: (list) => ListView(
          padding: const EdgeInsets.all(VoltiSpacing.screenGutter),
          children: [for (final m in list) _Bubble(message: m)],
        ),
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message});
  final SupportMessage message;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final scheme = Theme.of(context).colorScheme;
    final mine = message.authorType == MessageAuthorType.customer;
    final fg = mine ? VoltiColors.onBrand : scheme.onSurface;
    final n = message.attachmentObjectKeys?.length ?? 0;
    final time = formatTimeSp(message.createdAt);
    final author = mine ? l.chatYou : (message.authorName ?? l.chatSupportAgent);
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Semantics(
        container: true,
        label: '$author, $time',
        child: Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          constraints: const BoxConstraints(maxWidth: 300),
          decoration: BoxDecoration(
            // Verde 700 garante contraste >= 4,5:1 com o texto branco.
            color: mine ? VoltiColors.green700 : scheme.surfaceContainerHighest,
            borderRadius: VoltiRadii.rMd,
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            if (!mine && message.authorName != null)
              Text(message.authorName!, style: VoltiTypography.caption.copyWith(color: fg, fontWeight: VoltiTypography.fwBold)),
            Text(message.body, style: VoltiTypography.body.copyWith(color: fg)),
            if (n > 0)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(LucideIcons.paperclip, size: 14, color: fg),
                  const SizedBox(width: 4),
                  Text(l.chatAttachments(n), style: VoltiTypography.caption.copyWith(color: fg)),
                ]),
              ),
            const SizedBox(height: 2),
            Text(time, style: VoltiTypography.caption.copyWith(color: fg.withValues(alpha: .8))),
          ]),
        ),
      ),
    );
  }
}
